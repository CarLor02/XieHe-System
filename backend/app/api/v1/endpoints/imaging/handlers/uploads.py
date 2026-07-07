"""Object-storage upload session endpoints."""

from __future__ import annotations

import math
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.access.auth import get_current_active_user
from app.core.database.session import get_db
from app.core.config import settings
from app.core.system.logger import LogLevel, logger
from app.core.system.response import paginated_response, success_response
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.services.image_file_visibility import (
    replace_image_team_visibility,
    validate_assignable_team_ids,
)
from app.services.storage_gateway import StorageServiceError, storage_gateway
from app.services.batch_ai_import import batch_ai_status_for_image, process_batch_ai
from ..schemas.uploads import (
    BatchCompleteUploadRequest,
    BatchCompleteUploadResponse,
    BatchCompleteUploadResult,
    BatchCreateUploadSessionsRequest,
    BatchCreateUploadSessionsResponse,
    BatchUploadSessionItem,
    BatchUploadStatusItem,
    BatchUploadStatusResponse,
    CompleteUploadSessionRequest,
    CreateUploadSessionRequest,
    CreateUploadSessionResponse,
    PresignedUploadPart,
    UploadSessionStatus,
)

router = APIRouter()

ALLOWED_EXTENSIONS = {".dcm", ".dicom", ".jpg", ".jpeg", ".png", ".tiff", ".tif"}
ALLOWED_MIME_TYPES = {
    "application/dicom",
    "application/octet-stream",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/x-tiff",
}


def _sanitize_filename(filename: str) -> str:
    name = Path(filename).name.strip() or "image"
    return re.sub(r"[^A-Za-z0-9._-]+", "_", name)[:180]


def _determine_file_type(filename: str) -> ImageFileTypeEnum:
    ext = Path(filename).suffix.lower()
    if ext in {".dcm", ".dicom"}:
        return ImageFileTypeEnum.DICOM
    if ext in {".jpg", ".jpeg"}:
        return ImageFileTypeEnum.JPEG
    if ext == ".png":
        return ImageFileTypeEnum.PNG
    if ext in {".tif", ".tiff"}:
        return ImageFileTypeEnum.TIFF
    return ImageFileTypeEnum.OTHER


def _validate_upload_request(request: CreateUploadSessionRequest) -> None:
    ext = Path(request.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件扩展名",
        )
    if request.mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件类型",
        )


def _build_object_key(file_uuid: str, filename: str) -> str:
    return f"{file_uuid}/{_sanitize_filename(filename)}"


@router.post("/sessions", response_model=Dict[str, Any], summary="创建影像上传会话")
async def create_upload_session(
    request: CreateUploadSessionRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create an ImageFile row and return MinIO multipart presigned URLs."""

    _validate_upload_request(request)
    try:
        team_ids = validate_assignable_team_ids(db, current_user, request.team_ids)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    file_uuid = str(uuid.uuid4())
    object_key = _build_object_key(file_uuid, request.filename)
    bucket = settings.IMAGE_FILE_BUCKET
    part_size = settings.STORAGE_MULTIPART_PART_SIZE
    part_count = max(1, math.ceil(request.size / part_size))

    image_file = ImageFile(
        file_uuid=file_uuid,
        original_filename=request.filename,
        file_type=_determine_file_type(request.filename),
        mime_type=request.mime_type,
        storage_bucket=bucket,
        object_key=object_key,
        file_size=request.size,
        file_hash=request.file_hash,
        uploaded_by=current_user.get("id"),
        patient_id=request.patient_id,
        study_date=datetime.now(),
        description=request.description,
        status=ImageFileStatusEnum.UPLOADING,
        upload_progress=0,
    )

    try:
        await storage_gateway.ensure_bucket(bucket)
        upload_session = await storage_gateway.create_multipart_upload(
            bucket=bucket,
            object_key=object_key,
            content_type=request.mime_type,
            metadata={
                "image-file-id": "pending",
                "file-uuid": file_uuid,
                "original-filename": request.filename,
                "file-hash": request.file_hash or "",
            },
            part_count=part_count,
            expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
        )

        db.add(image_file)
        db.flush()
        replace_image_team_visibility(db, image_file, team_ids)
        db.commit()
        db.refresh(image_file)

        response = CreateUploadSessionResponse(
            image_file_id=image_file.id,
            file_uuid=image_file.file_uuid,
            storage_bucket=image_file.storage_bucket,
            object_key=image_file.object_key,
            upload_id=upload_session["upload_id"],
            part_size=part_size,
            expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            parts=[
                PresignedUploadPart(
                    part_number=part["part_number"],
                    url=part["url"],
                )
                for part in upload_session["parts"]
            ],
        )
        return success_response(data=response.dict(), message="上传会话创建成功")
    except StorageServiceError as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"创建对象存储上传会话失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用")
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"创建上传会话失败: {exc}")
        raise HTTPException(status_code=500, detail="创建上传会话失败")


@router.post("/batch/sessions", response_model=Dict[str, Any], summary="批量创建影像上传会话")
async def create_batch_upload_sessions(
    request: BatchCreateUploadSessionsRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Create ImageFile rows and MinIO multipart sessions for up to 200 files."""

    try:
        team_ids = validate_assignable_team_ids(db, current_user, request.team_ids)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    bucket = settings.IMAGE_FILE_BUCKET
    part_size = settings.STORAGE_MULTIPART_PART_SIZE
    session_items: list[BatchUploadSessionItem] = []

    for file_request in request.files:
        _validate_upload_request(
            CreateUploadSessionRequest(
                filename=file_request.filename,
                size=file_request.size,
                mime_type=file_request.mime_type,
                patient_id=request.patient_id,
                description=request.description,
                team_ids=request.team_ids,
                file_hash=file_request.file_hash,
            )
        )

    try:
        await storage_gateway.ensure_bucket(bucket)

        for file_request in request.files:
            file_uuid = str(uuid.uuid4())
            object_key = _build_object_key(file_uuid, file_request.filename)
            part_count = max(1, math.ceil(file_request.size / part_size))

            upload_session = await storage_gateway.create_multipart_upload(
                bucket=bucket,
                object_key=object_key,
                content_type=file_request.mime_type,
                metadata={
                    "image-file-id": "pending",
                    "file-uuid": file_uuid,
                    "original-filename": file_request.filename,
                    "file-hash": file_request.file_hash or "",
                },
                part_count=part_count,
                expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            )

            image_file = ImageFile(
                file_uuid=file_uuid,
                original_filename=file_request.filename,
                file_type=_determine_file_type(file_request.filename),
                mime_type=file_request.mime_type,
                storage_bucket=bucket,
                object_key=object_key,
                file_size=file_request.size,
                file_hash=file_request.file_hash,
                uploaded_by=current_user.get("id"),
                patient_id=request.patient_id,
                study_date=datetime.now(),
                description=request.description,
                status=ImageFileStatusEnum.UPLOADING,
                upload_progress=0,
            )
            db.add(image_file)
            db.flush()
            replace_image_team_visibility(db, image_file, team_ids)

            session_items.append(
                BatchUploadSessionItem(
                    client_file_id=file_request.client_file_id,
                    image_file_id=image_file.id,
                    file_uuid=image_file.file_uuid,
                    storage_bucket=image_file.storage_bucket,
                    object_key=image_file.object_key,
                    upload_id=upload_session["upload_id"],
                    part_size=part_size,
                    expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
                    parts=[
                        PresignedUploadPart(
                            part_number=part["part_number"],
                            url=part["url"],
                        )
                        for part in upload_session["parts"]
                    ],
                )
            )

        db.commit()
        return success_response(
            data=BatchCreateUploadSessionsResponse(items=session_items).dict(),
            message="批量上传会话创建成功",
        )
    except HTTPException:
        db.rollback()
        raise
    except StorageServiceError as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"批量创建对象存储上传会话失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用")
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"批量创建上传会话失败: {exc}")
        raise HTTPException(status_code=500, detail="批量创建上传会话失败")


@router.post("/batch/complete", response_model=Dict[str, Any], summary="批量完成影像上传并触发AI")
async def complete_batch_uploads(
    request: BatchCompleteUploadRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Complete multipart uploads and enqueue imported images for background AI."""

    results: list[BatchCompleteUploadResult] = []
    completed_ids: list[int] = []

    for item in request.items:
        image = db.query(ImageFile).filter(
            ImageFile.id == item.image_file_id,
            ImageFile.is_deleted == False,
        ).first()

        if not image:
            results.append(
                BatchCompleteUploadResult(
                    client_file_id=item.client_file_id,
                    image_file_id=item.image_file_id,
                    status=ImageFileStatusEnum.FAILED.value,
                    upload_progress=0,
                    ai_status="failed",
                    error="影像文件不存在",
                )
            )
            continue

        if image.uploaded_by != current_user.get("id"):
            results.append(
                BatchCompleteUploadResult(
                    client_file_id=item.client_file_id,
                    image_file_id=item.image_file_id,
                    status=image.status.value,
                    upload_progress=image.upload_progress,
                    ai_status=batch_ai_status_for_image(image),
                    error="无权完成此文件上传",
                )
            )
            continue

        if image.status not in {ImageFileStatusEnum.UPLOADING, ImageFileStatusEnum.FAILED}:
            results.append(
                BatchCompleteUploadResult(
                    client_file_id=item.client_file_id,
                    image_file_id=item.image_file_id,
                    status=image.status.value,
                    upload_progress=image.upload_progress,
                    ai_status=batch_ai_status_for_image(image),
                    error="当前影像状态不允许完成上传",
                )
            )
            continue

        try:
            complete_result = await storage_gateway.complete_multipart_upload(
                bucket=image.storage_bucket,
                object_key=image.object_key,
                upload_id=item.upload_id,
                parts=[
                    {"part_number": part.part_number, "etag": part.etag}
                    for part in item.parts
                ],
            )
            stat_result = await storage_gateway.stat_object(
                bucket=image.storage_bucket,
                object_key=image.object_key,
            )
            if stat_result.size != image.file_size:
                image.status = ImageFileStatusEnum.FAILED
                image.upload_progress = 0
                db.commit()
                results.append(
                    BatchCompleteUploadResult(
                        client_file_id=item.client_file_id,
                        image_file_id=image.id,
                        status=image.status.value,
                        upload_progress=image.upload_progress,
                        ai_status="failed",
                        error="对象大小校验失败",
                    )
                )
                continue

            expected_hash = item.file_hash or image.file_hash
            stored_hash = stat_result.metadata.get("file-hash") or stat_result.metadata.get("File-Hash")
            if expected_hash and stored_hash and expected_hash != stored_hash:
                image.status = ImageFileStatusEnum.FAILED
                image.upload_progress = 0
                db.commit()
                results.append(
                    BatchCompleteUploadResult(
                        client_file_id=item.client_file_id,
                        image_file_id=image.id,
                        status=image.status.value,
                        upload_progress=image.upload_progress,
                        ai_status="failed",
                        error="对象哈希校验失败",
                    )
                )
                continue

            image.storage_etag = complete_result.get("etag") or stat_result.etag
            image.status = ImageFileStatusEnum.UPLOADED
            image.upload_progress = 100
            image.uploaded_at = datetime.now()
            db.commit()
            db.refresh(image)
            completed_ids.append(image.id)
            results.append(
                BatchCompleteUploadResult(
                    client_file_id=item.client_file_id,
                    image_file_id=image.id,
                    status=image.status.value,
                    upload_progress=image.upload_progress,
                    ai_status="pending",
                )
            )
        except StorageServiceError as exc:
            db.rollback()
            image.status = ImageFileStatusEnum.FAILED
            image.upload_progress = 0
            db.commit()
            logger.emit_event(LogLevel.ERROR, message=f"批量完成对象存储上传失败: {exc}")
            results.append(
                BatchCompleteUploadResult(
                    client_file_id=item.client_file_id,
                    image_file_id=image.id,
                    status=image.status.value,
                    upload_progress=image.upload_progress,
                    ai_status="failed",
                    error="对象存储服务不可用",
                )
            )
        except Exception as exc:
            db.rollback()
            image.status = ImageFileStatusEnum.FAILED
            image.upload_progress = 0
            db.commit()
            logger.emit_event(LogLevel.ERROR, message=f"批量完成上传失败: {exc}")
            results.append(
                BatchCompleteUploadResult(
                    client_file_id=item.client_file_id,
                    image_file_id=image.id,
                    status=image.status.value,
                    upload_progress=image.upload_progress,
                    ai_status="failed",
                    error="完成上传失败",
                )
            )

    if completed_ids:
        background_tasks.add_task(
            process_batch_ai,
            completed_ids,
            current_user.get("id"),
        )

    return success_response(
        data=BatchCompleteUploadResponse(items=results).dict(),
        message="批量上传完成，AI处理已开始",
    )


@router.get("/batch/status", response_model=Dict[str, Any], summary="查询批量导入AI状态")
async def get_batch_upload_status(
    image_file_ids: str = Query(..., description="逗号分隔的影像文件ID"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    try:
        ids = [
            int(raw.strip())
            for raw in image_file_ids.split(",")
            if raw.strip()
        ]
    except ValueError:
        raise HTTPException(status_code=400, detail="image_file_ids 参数格式错误")

    if not ids or len(ids) > 200:
        raise HTTPException(status_code=400, detail="image_file_ids 数量必须在 1 到 200 之间")

    images = {
        image.id: image
        for image in db.query(ImageFile)
        .filter(
            ImageFile.id.in_(ids),
            ImageFile.is_deleted == False,
            ImageFile.uploaded_by == current_user.get("id"),
        )
        .all()
    }

    items: list[BatchUploadStatusItem] = []
    for image_id in ids:
        image = images.get(image_id)
        if image is None:
            items.append(
                BatchUploadStatusItem(
                    image_file_id=image_id,
                    status=ImageFileStatusEnum.FAILED.value,
                    upload_progress=0,
                    has_annotation=False,
                    ai_status="failed",
                    error="影像文件不存在",
                )
            )
            continue
        items.append(
            BatchUploadStatusItem(
                image_file_id=image.id,
                status=image.status.value,
                upload_progress=image.upload_progress,
                has_annotation=image.annotation is not None,
                ai_status=batch_ai_status_for_image(image),
            )
        )

    return success_response(
        data=BatchUploadStatusResponse(items=items).dict(),
        message="批量导入状态查询成功",
    )


@router.post("/sessions/{image_file_id}/complete", response_model=Dict[str, Any], summary="完成影像上传")
async def complete_upload_session(
    image_file_id: int,
    request: CompleteUploadSessionRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Complete multipart upload and mark the ImageFile as uploaded."""

    image = db.query(ImageFile).filter(
        ImageFile.id == image_file_id,
        ImageFile.is_deleted == False,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="影像文件不存在")
    if image.uploaded_by != current_user.get("id"):
        raise HTTPException(status_code=403, detail="无权完成此文件上传")
    if image.status not in {ImageFileStatusEnum.UPLOADING, ImageFileStatusEnum.FAILED}:
        raise HTTPException(status_code=400, detail="当前影像状态不允许完成上传")

    try:
        complete_result = await storage_gateway.complete_multipart_upload(
            bucket=image.storage_bucket,
            object_key=image.object_key,
            upload_id=request.upload_id,
            parts=[
                {"part_number": part.part_number, "etag": part.etag}
                for part in request.parts
            ],
        )
        stat_result = await storage_gateway.stat_object(
            bucket=image.storage_bucket,
            object_key=image.object_key,
        )
        if stat_result.size != image.file_size:
            image.status = ImageFileStatusEnum.FAILED
            image.upload_progress = 0
            db.commit()
            raise HTTPException(status_code=400, detail="对象大小校验失败")

        expected_hash = request.file_hash or image.file_hash
        stored_hash = stat_result.metadata.get("file-hash") or stat_result.metadata.get("File-Hash")
        if expected_hash and stored_hash and expected_hash != stored_hash:
            image.status = ImageFileStatusEnum.FAILED
            image.upload_progress = 0
            db.commit()
            raise HTTPException(status_code=400, detail="对象哈希校验失败")

        image.storage_etag = complete_result.get("etag") or stat_result.etag
        image.status = ImageFileStatusEnum.UPLOADED
        image.upload_progress = 100
        image.uploaded_at = datetime.now()
        db.commit()
        db.refresh(image)

        return success_response(
            data=UploadSessionStatus(
                image_file_id=image.id,
                file_uuid=image.file_uuid,
                status=image.status.value,
                upload_progress=image.upload_progress,
            ).dict(),
            message="文件上传完成",
        )
    except HTTPException:
        raise
    except StorageServiceError as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"完成对象存储上传失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用")
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"完成上传失败: {exc}")
        raise HTTPException(status_code=500, detail="完成上传失败")


@router.get("/status/{image_file_id}", response_model=Dict[str, Any], summary="获取上传状态")
async def get_upload_status(
    image_file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    image = db.query(ImageFile).filter(
        ImageFile.id == image_file_id,
        ImageFile.is_deleted == False,
    ).first()
    if not image:
        raise HTTPException(status_code=404, detail="未找到上传记录")
    if image.uploaded_by != current_user.get("id"):
        raise HTTPException(status_code=403, detail="无权查看此上传记录")
    return success_response(
        data=UploadSessionStatus(
            image_file_id=image.id,
            file_uuid=image.file_uuid,
            status=image.status.value,
            upload_progress=image.upload_progress,
        ).dict(),
        message="获取上传状态成功",
    )


@router.get("/records", response_model=Dict[str, Any], summary="获取文件上传记录")
async def get_upload_records(
    page: int = 1,
    page_size: int = 20,
    patient_id: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(ImageFile).filter(
        ImageFile.is_deleted == False,
        ImageFile.uploaded_by == current_user.get("id"),
    )
    if patient_id:
        query = query.filter(ImageFile.patient_id == patient_id)

    total = query.count()
    records = query.order_by(ImageFile.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    items = [
        {
            "id": image.id,
            "file_id": image.id,
            "file_uuid": image.file_uuid,
            "filename": image.original_filename,
            "file_size": image.file_size,
            "file_type": image.file_type.value,
            "mime_type": image.mime_type,
            "status": image.status.value,
            "patient_id": image.patient_id,
            "uploaded_at": image.uploaded_at,
            "description": image.description,
        }
        for image in records
    ]
    return paginated_response(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        message="获取上传记录成功",
    )
