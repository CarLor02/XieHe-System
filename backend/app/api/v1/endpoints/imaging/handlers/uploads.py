"""Object-storage upload session and durable batch-import endpoints."""

from __future__ import annotations

import math
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.access.auth import get_current_active_user
from app.core.config import settings
from app.core.database.session import get_db
from app.core.system.logger import LogLevel, logger
from app.core.system.response import paginated_response, success_response
from app.models.image import AITaskStatusEnum
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.image_import import (
    ImageImportAiStatus,
    ImageImportBatch,
    ImageImportBatchStatus,
    ImageImportItem,
    ImageImportUploadStatus,
)
from app.models.patient import Patient
from app.services.ai_task_queue import publish_ai_task_event
from app.services.image_file_visibility import (
    replace_image_team_visibility,
    validate_assignable_team_ids,
)
from app.services.image_import_service import (
    ai_task_event,
    ensure_ai_task,
    refresh_batch_status,
    serialize_import_batch,
    serialize_import_item,
)
from app.services.storage_gateway import StorageServiceError, storage_gateway

from ..schemas.uploads import (
    CompleteImageImportItemRequest,
    CompleteUploadSessionRequest,
    CreateImageImportBatchRequest,
    CreateImageImportSessionsRequest,
    CreateUploadSessionRequest,
    CreateUploadSessionResponse,
    MarkImageImportUploadFailedRequest,
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


def _owned_batch(db: Session, batch_id: str, user_id: int) -> ImageImportBatch:
    batch = (
        db.query(ImageImportBatch)
        .filter(
            ImageImportBatch.batch_id == batch_id,
            ImageImportBatch.uploaded_by == user_id,
        )
        .first()
    )
    if batch is None:
        raise HTTPException(status_code=404, detail="批量导入任务不存在")
    return batch


def _owned_item(
    db: Session,
    batch: ImageImportBatch,
    item_id: int,
) -> ImageImportItem:
    item = (
        db.query(ImageImportItem)
        .filter(
            ImageImportItem.id == item_id,
            ImageImportItem.batch_id == batch.id,
        )
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="批量导入项不存在")
    return item


def _upload_session_payload(
    item: ImageImportItem,
    image: ImageFile,
    upload_session: dict[str, Any],
    part_size: int,
) -> dict[str, Any]:
    return {
        "item_id": item.id,
        "client_file_id": item.client_file_id,
        "image_file_id": image.id,
        "file_uuid": image.file_uuid,
        "storage_bucket": image.storage_bucket,
        "object_key": image.object_key,
        "upload_id": upload_session["upload_id"],
        "part_size": part_size,
        "expires_in": settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
        "parts": [
            {
                "part_number": part["part_number"],
                "url": part["url"],
            }
            for part in upload_session["parts"]
        ],
    }


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
        raise HTTPException(status_code=403, detail=str(exc)) from exc

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
        raise HTTPException(status_code=502, detail="对象存储服务不可用") from exc
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"创建上传会话失败: {exc}")
        raise HTTPException(status_code=500, detail="创建上传会话失败") from exc


@router.get("/batches/config", response_model=Dict[str, Any], summary="获取批量导入配置")
async def get_image_import_config(
    _: dict = Depends(get_current_active_user),
):
    return success_response(
        data={
            "max_files": settings.BATCH_IMPORT_MAX_FILES,
            "session_window_size": 10,
        },
        message="批量导入配置查询成功",
    )


@router.post("/batches", response_model=Dict[str, Any], summary="创建批量导入任务")
async def create_image_import_batch(
    request: CreateImageImportBatchRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    if len(request.files) > settings.BATCH_IMPORT_MAX_FILES:
        raise HTTPException(
            status_code=400,
            detail=f"一次最多导入 {settings.BATCH_IMPORT_MAX_FILES} 张影像",
        )
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
    if db.query(Patient.id).filter(Patient.id == request.patient_id).first() is None:
        raise HTTPException(status_code=404, detail="患者不存在")
    try:
        team_ids = validate_assignable_team_ids(db, current_user, request.team_ids)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc

    batch = ImageImportBatch(
        batch_id=uuid.uuid4().hex,
        uploaded_by=current_user["id"],
        patient_id=request.patient_id,
        description=request.description,
        team_ids=team_ids,
        status=ImageImportBatchStatus.UPLOADING.value,
        total_items=len(request.files),
    )
    db.add(batch)
    db.flush()
    items = [
        ImageImportItem(
            batch_id=batch.id,
            client_file_id=file.client_file_id,
            filename=file.filename,
            size=file.size,
            mime_type=file.mime_type,
            file_hash=file.file_hash,
            upload_status=ImageImportUploadStatus.PENDING.value,
            ai_status=ImageImportAiStatus.PENDING.value,
        )
        for file in request.files
    ]
    db.add_all(items)
    db.commit()
    db.refresh(batch)
    return success_response(
        data={
            **serialize_import_batch(batch),
            "items": [serialize_import_item(item) for item in items],
        },
        message="批量导入任务创建成功",
    )


@router.post(
    "/batches/{batch_id}/sessions",
    response_model=Dict[str, Any],
    summary="为批量导入项创建上传会话",
)
async def create_image_import_sessions(
    batch_id: str,
    request: CreateImageImportSessionsRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    batch = _owned_batch(db, batch_id, current_user["id"])
    items = (
        db.query(ImageImportItem)
        .filter(
            ImageImportItem.batch_id == batch.id,
            ImageImportItem.id.in_(request.item_ids),
        )
        .order_by(ImageImportItem.id)
        .all()
    )
    if len(items) != len(set(request.item_ids)):
        raise HTTPException(status_code=404, detail="部分批量导入项不存在")

    bucket = settings.IMAGE_FILE_BUCKET
    part_size = settings.STORAGE_MULTIPART_PART_SIZE
    sessions: list[dict[str, Any]] = []
    try:
        await storage_gateway.ensure_bucket(bucket)
        for item in items:
            if item.upload_status == ImageImportUploadStatus.UPLOADED.value:
                continue
            file_uuid = str(uuid.uuid4())
            object_key = _build_object_key(file_uuid, item.filename)
            upload_session = await storage_gateway.create_multipart_upload(
                bucket=bucket,
                object_key=object_key,
                content_type=item.mime_type,
                metadata={
                    "image-file-id": "pending",
                    "file-uuid": file_uuid,
                    "original-filename": item.filename,
                    "file-hash": item.file_hash or "",
                },
                part_count=max(1, math.ceil(item.size / part_size)),
                expires_in=settings.STORAGE_PRESIGN_EXPIRES_SECONDS,
            )
            image = ImageFile(
                file_uuid=file_uuid,
                original_filename=item.filename,
                file_type=_determine_file_type(item.filename),
                mime_type=item.mime_type,
                storage_bucket=bucket,
                object_key=object_key,
                file_size=item.size,
                file_hash=item.file_hash,
                uploaded_by=batch.uploaded_by,
                patient_id=batch.patient_id,
                study_date=datetime.now(),
                description=batch.description,
                status=ImageFileStatusEnum.UPLOADING,
                upload_progress=0,
            )
            db.add(image)
            db.flush()
            replace_image_team_visibility(db, image, batch.team_ids or [])
            item.image_file_id = image.id
            item.upload_id = upload_session["upload_id"]
            item.upload_status = ImageImportUploadStatus.SESSION_CREATED.value
            item.error_message = None
            sessions.append(_upload_session_payload(item, image, upload_session, part_size))

        refresh_batch_status(db, batch)
        db.commit()
        return success_response(
            data={"items": sessions},
            message="批量上传会话创建成功",
        )
    except StorageServiceError as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"批量创建对象存储上传会话失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用") from exc
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"批量创建上传会话失败: {exc}")
        raise HTTPException(status_code=500, detail="批量创建上传会话失败") from exc


@router.post(
    "/batches/{batch_id}/items/{item_id}/complete",
    response_model=Dict[str, Any],
    summary="完成单个批量导入项并加入AI队列",
)
async def complete_image_import_item(
    batch_id: str,
    item_id: int,
    request: CompleteImageImportItemRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    batch = _owned_batch(db, batch_id, current_user["id"])
    item = _owned_item(db, batch, item_id)
    image = (
        db.query(ImageFile)
        .filter(
            ImageFile.id == item.image_file_id,
            ImageFile.is_deleted == False,
        )
        .first()
    )
    if image is None:
        raise HTTPException(status_code=404, detail="影像文件不存在")

    try:
        if item.upload_status != ImageImportUploadStatus.UPLOADED.value:
            if request.upload_id != item.upload_id:
                raise HTTPException(status_code=409, detail="上传会话已失效")
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
                raise HTTPException(status_code=400, detail="对象大小校验失败")
            expected_hash = request.file_hash or image.file_hash
            stored_hash = (
                stat_result.metadata.get("file-hash")
                or stat_result.metadata.get("File-Hash")
            )
            if expected_hash and stored_hash and expected_hash != stored_hash:
                raise HTTPException(status_code=400, detail="对象哈希校验失败")
            image.storage_etag = complete_result.get("etag") or stat_result.etag
            image.status = ImageFileStatusEnum.UPLOADED
            image.upload_progress = 100
            image.uploaded_at = datetime.now()
            item.upload_status = ImageImportUploadStatus.UPLOADED.value

        task = ensure_ai_task(db, item, requested_by=current_user["id"])
        refresh_batch_status(db, batch)
        event = ai_task_event(task, item, batch)
        db.commit()
    except HTTPException:
        db.rollback()
        raise
    except StorageServiceError as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"完成对象存储上传失败: {exc}")
        raise HTTPException(status_code=502, detail="对象存储服务不可用") from exc
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"完成批量导入项失败: {exc}")
        raise HTTPException(status_code=500, detail="完成上传失败") from exc

    response_message = "影像上传完成，AI任务已提交"
    try:
        await publish_ai_task_event(event)
    except Exception as exc:  # noqa: BLE001 - durable task remains retryable.
        db.rollback()
        item = _owned_item(db, batch, item_id)
        item.ai_status = ImageImportAiStatus.PENDING.value
        item.error_message = "AI任务排队失败，可重新入队"
        refresh_batch_status(db, batch)
        db.commit()
        logger.emit_event(LogLevel.ERROR, message=f"AI任务发布失败: {exc}")
        response_message = "影像上传完成，AI任务排队失败，可重新入队"

    db.refresh(item)
    return success_response(
        data=serialize_import_item(item),
        message=response_message,
    )


@router.post(
    "/batches/{batch_id}/items/{item_id}/upload-failed",
    response_model=Dict[str, Any],
    summary="记录单个批量导入项上传失败",
)
async def mark_image_import_upload_failed(
    batch_id: str,
    item_id: int,
    request: MarkImageImportUploadFailedRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    batch = _owned_batch(db, batch_id, current_user["id"])
    item = _owned_item(db, batch, item_id)
    if item.upload_status == ImageImportUploadStatus.UPLOADED.value:
        return success_response(
            data=serialize_import_item(item),
            message="影像已经上传完成，忽略迟到的失败回报",
        )
    item.upload_status = ImageImportUploadStatus.FAILED.value
    item.ai_status = ImageImportAiStatus.FAILED.value
    item.error_message = request.error
    if item.image_file is not None:
        item.image_file.status = ImageFileStatusEnum.FAILED
        item.image_file.upload_progress = 0
    refresh_batch_status(db, batch)
    db.commit()
    db.refresh(item)
    return success_response(
        data=serialize_import_item(item),
        message="上传失败状态已记录",
    )


@router.post(
    "/batches/{batch_id}/items/{item_id}/enqueue",
    response_model=Dict[str, Any],
    summary="重新提交批量导入AI任务",
)
async def enqueue_image_import_item(
    batch_id: str,
    item_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    batch = _owned_batch(db, batch_id, current_user["id"])
    item = _owned_item(db, batch, item_id)
    if item.upload_status != ImageImportUploadStatus.UPLOADED.value:
        raise HTTPException(status_code=409, detail="影像尚未上传完成")
    task = ensure_ai_task(db, item, requested_by=current_user["id"])
    if task.status == AITaskStatusEnum.COMPLETED:
        return success_response(
            data=serialize_import_item(item),
            message="AI任务已经完成",
        )
    if item.image_file is not None and item.image_file.status == ImageFileStatusEnum.FAILED:
        item.image_file.status = ImageFileStatusEnum.UPLOADED
    refresh_batch_status(db, batch)
    event = ai_task_event(task, item, batch)
    db.commit()
    try:
        await publish_ai_task_event(event)
    except Exception as exc:
        item = _owned_item(db, batch, item_id)
        item.ai_status = ImageImportAiStatus.PENDING.value
        item.error_message = "AI任务排队失败，可重新入队"
        db.commit()
        raise HTTPException(status_code=503, detail="AI任务队列暂不可用") from exc
    db.refresh(item)
    return success_response(data=serialize_import_item(item), message="AI任务已重新提交")


@router.get("/batches", response_model=Dict[str, Any], summary="查询批量导入任务")
async def list_image_import_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    batch_status: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    query = db.query(ImageImportBatch).filter(
        ImageImportBatch.uploaded_by == current_user["id"]
    )
    if batch_status:
        query = query.filter(ImageImportBatch.status == batch_status.upper())
    total = query.count()
    batches = (
        query.order_by(ImageImportBatch.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return paginated_response(
        items=[serialize_import_batch(batch) for batch in batches],
        total=total,
        page=page,
        page_size=page_size,
        message="批量导入任务查询成功",
    )


@router.get(
    "/batches/{batch_id}/items",
    response_model=Dict[str, Any],
    summary="查询批量导入项",
)
async def list_image_import_items(
    batch_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    batch = _owned_batch(db, batch_id, current_user["id"])
    query = db.query(ImageImportItem).filter(ImageImportItem.batch_id == batch.id)
    total = query.count()
    items = (
        query.order_by(ImageImportItem.id)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return paginated_response(
        items=[serialize_import_item(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        message="批量导入项查询成功",
    )


@router.post(
    "/sessions/{image_file_id}/complete",
    response_model=Dict[str, Any],
    summary="完成影像上传",
)
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
        stored_hash = (
            stat_result.metadata.get("file-hash")
            or stat_result.metadata.get("File-Hash")
        )
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
        raise HTTPException(status_code=502, detail="对象存储服务不可用") from exc
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"完成上传失败: {exc}")
        raise HTTPException(status_code=500, detail="完成上传失败") from exc


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
    records = (
        query.order_by(ImageFile.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
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
