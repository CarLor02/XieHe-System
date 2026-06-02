"""
影像文件管理API

提供影像文件的查询、列表、下载等功能
支持按用户、患者、日期等条件查询

作者: XieHe Medical System
创建时间: 2026-01-05
"""

import asyncio
from typing import Any, Optional
from datetime import datetime, date, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status as http_status
from fastapi.responses import RedirectResponse
import httpx
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.core.database.session import get_db
from app.core.access.auth import get_current_active_user
from app.core.config import settings
from app.core.system.concurrency import require_ai_object_slot, require_batch_presign_slot
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response, paginated_response
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.patient import Patient
from app.models.user import User
from app.models.image import ImageAnnotation
from app.services.storage_gateway import StorageServiceError, storage_gateway
from app.services.image_file_visibility import (
    apply_image_visibility_filter,
    get_visible_image_file,
)
from ..schemas.files import (
    BatchDownloadUrlsRequest,
    ImageFileResponse,
    ImageFileStatsResponse,
    UpdateExamTypeRequest,
    UpdateAnnotationRequest,
)

router = APIRouter()
_ai_object_client: Optional[httpx.AsyncClient] = None
_ai_object_client_lock = asyncio.Lock()

READY_FOR_MODEL_STATUSES = {
    ImageFileStatusEnum.UPLOADED,
    ImageFileStatusEnum.PROCESSED,
}


async def start_ai_object_client(
    async_transport: Optional[httpx.AsyncBaseTransport] = None,
) -> None:
    async with _ai_object_client_lock:
        global _ai_object_client
        if _ai_object_client is not None and not _ai_object_client.is_closed:
            return
        _ai_object_client = httpx.AsyncClient(
            timeout=settings.AI_MODEL_TIMEOUT,
            transport=async_transport,
        )


async def stop_ai_object_client() -> None:
    async with _ai_object_client_lock:
        global _ai_object_client
        client = _ai_object_client
        _ai_object_client = None
        if client is not None and not client.is_closed:
            await client.aclose()


async def _get_ai_object_client() -> httpx.AsyncClient:
    await start_ai_object_client()
    assert _ai_object_client is not None
    return _ai_object_client


def _image_file_response(
    image: ImageFile,
    uploader_name: Optional[str] = None,
    patient_name: Optional[str] = None,
) -> ImageFileResponse:
    return ImageFileResponse(
        id=image.id,
        file_uuid=image.file_uuid,
        original_filename=image.original_filename,
        file_type=image.file_type.value,
        mime_type=image.mime_type,
        file_size=image.file_size,
        storage_bucket=image.storage_bucket,
        object_key=image.object_key,
        storage_etag=image.storage_etag,
        thumbnail_path=image.thumbnail_path,
        uploaded_by=image.uploaded_by,
        uploader_name=uploader_name,
        patient_id=image.patient_id,
        patient_name=patient_name,
        study_date=image.study_date,
        description=image.description,
        annotation=image.annotation,
        status=image.status.value,
        upload_progress=image.upload_progress,
        created_at=image.created_at,
        uploaded_at=image.uploaded_at,
    )


def _image_file_related_names(db: Session, image: ImageFile) -> tuple[Optional[str], Optional[str]]:
    uploader_name = None
    patient_name = None

    if image.uploaded_by:
        uploader_name = db.query(User.real_name).filter(User.id == image.uploaded_by).scalar()

    if image.patient_id:
        patient_name = db.query(Patient.name).filter(Patient.id == image.patient_id).scalar()

    return uploader_name, patient_name


def _set_presign_cache_headers(response: Response, expires_in: int) -> None:
    max_age = max(expires_in - 60, 0)
    response.headers["Cache-Control"] = f"private, max-age={max_age}"
    response.headers["Vary"] = "Authorization"


def _download_url_payload(
    image: ImageFile,
    url: str,
    expires_in: int,
) -> dict:
    return {
        "url": url,
        "expires_in": expires_in,
        "expires_at": (datetime.now(timezone.utc) + timedelta(seconds=expires_in)).isoformat(),
        "filename": image.original_filename,
        "mime_type": image.mime_type,
        "etag": image.storage_etag,
    }


def _get_visible_image_files_by_ids(
    db: Session,
    file_ids: list[int],
    current_user: dict[str, Any],
) -> dict[int, ImageFile]:
    if not file_ids:
        return {}

    query = db.query(ImageFile).filter(
        ImageFile.id.in_(file_ids),
        ImageFile.is_deleted == False,
    )
    visible_query = apply_image_visibility_filter(query, db, current_user)
    return {image.id: image for image in visible_query.all()}


def _enum_value(value: Any) -> str:
    return value.value if hasattr(value, "value") else str(value)


def _is_lateral_image(image: ImageFile) -> bool:
    return image.description == "侧位X光片"


def _model_object_payload(image: ImageFile) -> dict[str, str]:
    return {
        "bucket": image.storage_bucket,
        "object_key": image.object_key,
        "image_id": f"IMG{image.id}",
    }


def _get_ai_object_url(image: ImageFile, operation: str) -> str:
    if operation == "predict":
        url = (
            settings.AI_LATERAL_PREDICT_OBJECT_URL
            if _is_lateral_image(image)
            else settings.AI_FRONT_PREDICT_OBJECT_URL
        )
    elif operation == "detect-keypoints":
        url = (
            settings.AI_LATERAL_DETECT_OBJECT_URL
            if _is_lateral_image(image)
            else settings.AI_FRONT_KEYPOINTS_OBJECT_URL
        )
    else:
        raise ValueError(f"unsupported AI operation: {operation}")

    if not url:
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI模型 object 接口未配置",
        )
    return url


def _get_ai_ready_visible_image(
    db: Session,
    file_id: int,
    current_user: dict[str, Any],
) -> ImageFile:
    image = get_visible_image_file(db, file_id, current_user)
    if not image:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="影像文件不存在",
        )

    if image.status not in READY_FOR_MODEL_STATUSES:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail="影像文件尚未完成上传",
        )

    return image


async def _post_ai_object_request(url: str, payload: dict[str, str]) -> dict[str, Any]:
    try:
        client = await _get_ai_object_client()
        response = await client.post(url, json=payload)
    except httpx.HTTPError as exc:
        logger.emit_event(LogLevel.ERROR, message=f"AI模型 object 请求失败: {exc}")
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="AI模型服务不可用",
        )

    if response.status_code >= 400:
        detail: Any
        try:
            detail = response.json()
        except ValueError:
            detail = response.text
        raise HTTPException(status_code=response.status_code, detail=detail)

    try:
        payload_data = response.json()
    except ValueError as exc:
        logger.emit_event(LogLevel.ERROR, message=f"AI模型 object 响应不是 JSON: {exc}")
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="AI模型响应格式错误",
        )
    if not isinstance(payload_data, dict):
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="AI模型响应格式错误",
        )
    return payload_data


# API 端点
@router.get("", response_model=dict, summary="获取影像文件列表")
async def get_image_files_list(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    file_type: Optional[ImageFileTypeEnum] = Query(None, description="文件类型"),
    file_status: Optional[ImageFileStatusEnum] = Query(None, description="文件状态（UPLOADED/PROCESSING/PROCESSED/FAILED）"),
    status: Optional[str] = Query(None, description="兼容参数：pending=待处理"),
    pending_only: Optional[bool] = Query(None, description="仅显示待处理（状态不是PROCESSED 或 没有测量数据）"),
    review_status: Optional[str] = Query(None, description="审核状态(reviewed/unreviewed)"),
    description: Optional[str] = Query(None, description="检查类型"),
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取影像文件列表

    支持多种筛选条件：
    - status=pending 或 pending_only=true: 仅显示待处理（状态不是PROCESSED 或 没有ImageAnnotation）
    - review_status=reviewed: 已审核（有ImageAnnotation）
    - review_status=unreviewed: 未审核（没有ImageAnnotation）
    - file_status: 按具体状态筛选（UPLOADED/PROCESSING/PROCESSED/FAILED）
    - file_type: 按文件类型筛选
    - search: 搜索文件名、患者姓名、检查类型

    权限控制：
    - 普通用户：只能看到自己上传的影像
    - 团队负责人(ADMIN)：能看到团队所有成员上传的影像
    - 超级管理员(is_superuser)：能看到全部影像
    """
    try:
        # 构建查询
        query = db.query(
            ImageFile,
            Patient.name.label("patient_name"),
            User.real_name.label("uploader_name"),
        ).outerjoin(
            Patient, ImageFile.patient_id == Patient.id
        ).outerjoin(
            User, ImageFile.uploaded_by == User.id
        ).filter(ImageFile.is_deleted == False)
        query = apply_image_visibility_filter(query, db, current_user)

        # 待处理筛选 - 优先级最高
        # 支持 status=pending（兼容旧接口）或 pending_only=true
        if status == 'pending' or pending_only:
            # 待处理 = 状态不是PROCESSED 或 没有ImageAnnotation
            # 使用子查询避免 JOIN 导致的重复
            subquery = db.query(ImageAnnotation.image_file_id).distinct().subquery()
            query = query.outerjoin(
                subquery,
                ImageFile.id == subquery.c.image_file_id
            ).filter(
                or_(
                    ImageFile.status != ImageFileStatusEnum.PROCESSED,
                    subquery.c.image_file_id == None
                )
            )
        elif review_status:
            # 审核状态筛选
            subquery = db.query(ImageAnnotation.image_file_id).distinct().subquery()
            if review_status == 'reviewed':
                # 已审核：有ImageAnnotation记录
                query = query.join(
                    subquery,
                    ImageFile.id == subquery.c.image_file_id
                )
            elif review_status == 'unreviewed':
                # 未审核：没有ImageAnnotation记录
                query = query.outerjoin(
                    subquery,
                    ImageFile.id == subquery.c.image_file_id
                ).filter(subquery.c.image_file_id == None)
        elif file_status:
            # 按具体状态筛选
            query = query.filter(ImageFile.status == file_status)

        # 其他筛选条件
        if file_type:
            query = query.filter(ImageFile.file_type == file_type)

        if description:
            query = query.filter(ImageFile.description == description)

        if start_date:
            query = query.filter(ImageFile.created_at >= start_date)

        if end_date:
            query = query.filter(ImageFile.created_at <= end_date)

        # 搜索
        if search:
            search_pattern = f"%{search}%"
            query = query.filter(
                or_(
                    ImageFile.original_filename.ilike(search_pattern),
                    ImageFile.description.ilike(search_pattern),
                    Patient.name.ilike(search_pattern)
                )
            )

        # 分页
        total = query.count()
        image_rows = query.order_by(ImageFile.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        items = [
            _image_file_response(
                image,
                uploader_name=uploader_name,
                patient_name=patient_name,
            ).dict()
            for image, patient_name, uploader_name in image_rows
        ]

        return paginated_response(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            message="影像文件列表查询成功"
        )

    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取影像列表失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取影像列表失败: {str(e)}"
        )


@router.get("/patient/{patient_id}", response_model=dict, summary="获取患者的影像文件")
async def get_patient_images(
    patient_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定患者的所有影像文件
    """
    try:
        # 构建查询
        query = db.query(
            ImageFile,
            Patient.name.label("patient_name"),
            User.real_name.label("uploader_name"),
        ).outerjoin(
            Patient, ImageFile.patient_id == Patient.id
        ).outerjoin(
            User, ImageFile.uploaded_by == User.id
        ).filter(
            ImageFile.patient_id == patient_id,
            ImageFile.is_deleted == False
        )
        query = apply_image_visibility_filter(query, db, current_user)

        total = query.count()
        image_rows = query.order_by(ImageFile.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
        
        items = [
            _image_file_response(
                image,
                uploader_name=uploader_name,
                patient_name=patient_name,
            ).dict()
            for image, patient_name, uploader_name in image_rows
        ]

        return paginated_response(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            message="患者影像文件查询成功"
        )
        
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取患者影像文件失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取患者影像文件失败"
        )


@router.post("/{file_id}/ai/predict", summary="使用对象存储影像执行AI测量")
async def run_image_file_ai_predict(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    _slot: None = Depends(require_ai_object_slot),
):
    image = _get_ai_ready_visible_image(db, file_id, current_user)
    return await _post_ai_object_request(
        _get_ai_object_url(image, "predict"),
        _model_object_payload(image),
    )


@router.post("/{file_id}/ai/detect-keypoints", summary="使用对象存储影像执行AI关键点检测")
async def run_image_file_ai_detect_keypoints(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    _slot: None = Depends(require_ai_object_slot),
):
    image = _get_ai_ready_visible_image(db, file_id, current_user)
    return await _post_ai_object_request(
        _get_ai_object_url(image, "detect-keypoints"),
        _model_object_payload(image),
    )


@router.get("/{file_id}", response_model=dict, summary="获取影像文件详情")
async def get_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定影像文件的详细信息
    """
    try:
        image = get_visible_image_file(db, file_id, current_user)

        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )
        
        uploader_name, patient_name = _image_file_related_names(db, image)

        return success_response(
            data=_image_file_response(
                image,
                uploader_name=uploader_name,
                patient_name=patient_name,
            ).dict(),
            message="影像文件详情查询成功"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取影像文件详情失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像文件详情失败"
        )


@router.get("/{file_id}/download-url", summary="获取影像文件临时访问地址")
async def get_image_file_download_url(
    file_id: int,
    response: Response,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取经 Nginx 代理的 MinIO presigned URL。
    """
    try:
        image = get_visible_image_file(db, file_id, current_user)
        
        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        if image.status not in {ImageFileStatusEnum.UPLOADED, ImageFileStatusEnum.PROCESSED}:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="影像文件尚未完成上传",
            )

        expires_in = settings.STORAGE_PRESIGN_EXPIRES_SECONDS
        url = await storage_gateway.presign_get(
            bucket=image.storage_bucket,
            object_key=image.object_key,
            expires_in=expires_in,
        )
        _set_presign_cache_headers(response, expires_in)

        return success_response(
            data=_download_url_payload(image, url, expires_in),
            message="获取影像访问地址成功",
        )

    except StorageServiceError as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取影像访问地址失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="对象存储服务不可用",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取影像访问地址失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像访问地址失败"
        )


@router.post("/download-urls", summary="批量获取影像文件临时访问地址")
async def get_image_file_download_urls(
    request: BatchDownloadUrlsRequest,
    response: Response,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    _slot: None = Depends(require_batch_presign_slot),
):
    """
    批量获取经 Nginx 代理的 MinIO presigned URL。
    """
    expires_in = settings.STORAGE_PRESIGN_EXPIRES_SECONDS
    _set_presign_cache_headers(response, expires_in)

    items: dict[int, dict] = {}
    errors: dict[int, dict[str, str]] = {}
    seen_ids: set[int] = set()
    ordered_ids: list[int] = []

    for file_id in request.ids:
        if file_id in seen_ids:
            continue
        seen_ids.add(file_id)
        ordered_ids.append(file_id)

    visible_images = _get_visible_image_files_by_ids(db, ordered_ids, current_user)

    for file_id in ordered_ids:
        image = visible_images.get(file_id)
        if not image:
            errors[file_id] = {
                "code": "not_found",
                "message": "影像文件不存在",
            }
            continue

        if image.status not in {ImageFileStatusEnum.UPLOADED, ImageFileStatusEnum.PROCESSED}:
            errors[file_id] = {
                "code": "not_ready",
                "message": "影像文件尚未完成上传",
            }
            continue

        try:
            url = await storage_gateway.presign_get(
                bucket=image.storage_bucket,
                object_key=image.object_key,
                expires_in=expires_in,
            )
        except StorageServiceError as exc:
            logger.emit_event(LogLevel.ERROR, message=f"批量获取影像访问地址失败: {exc}")
            errors[file_id] = {
                "code": "storage_error",
                "message": "对象存储服务不可用",
            }
            continue

        items[file_id] = _download_url_payload(image, url, expires_in)

    return success_response(
        data={
            "items": items,
            "errors": errors,
        },
        message="批量获取影像访问地址成功",
    )


@router.get("/{file_id}/download", summary="下载影像文件")
async def download_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """Compatibility endpoint: authorize in FastAPI, then redirect to MinIO via Nginx."""

    envelope = await get_image_file_download_url(
        file_id,
        response=Response(),
        current_user=current_user,
        db=db,
    )
    return RedirectResponse(url=envelope["data"]["url"], status_code=307)


@router.delete("/{file_id}", summary="删除影像文件")
async def delete_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    软删除指定的影像文件
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()
        
        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        # 检查权限：只能删除自己上传的文件
        if image.uploaded_by != current_user.get('id'):
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="无权删除此文件"
            )
        
        # 软删除
        image.is_deleted = True
        image.deleted_at = datetime.now()
        image.deleted_by = current_user.get('id')

        db.commit()

        return success_response(
            data={"file_id": file_id},
            message="影像文件已删除"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"删除影像文件失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除影像文件失败"
        )


@router.get("/stats/summary", response_model=dict, summary="获取影像文件统计")
async def get_image_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户可见范围内的影像文件统计信息
    """
    try:
        # 总文件数和总大小
        query = db.query(ImageFile).filter(
            ImageFile.is_deleted == False
        )
        visible_query = apply_image_visibility_filter(query, db, current_user)

        total_files, total_size = visible_query.with_entities(
            func.count(ImageFile.id),
            func.coalesce(func.sum(ImageFile.file_size), 0),
        ).one()

        by_type = {
            _enum_value(file_type): count
            for file_type, count in visible_query.with_entities(
                ImageFile.file_type,
                func.count(ImageFile.id),
            ).group_by(ImageFile.file_type).all()
        }

        by_status = {
            _enum_value(file_status): count
            for file_status, count in visible_query.with_entities(
                ImageFile.status,
                func.count(ImageFile.id),
            ).group_by(ImageFile.status).all()
        }
        
        return success_response(
            data=ImageFileStatsResponse(
                total_files=total_files,
                total_size=total_size,
                by_type=by_type,
                by_status=by_status,
            ).dict(),
            message="影像统计查询成功"
        )
        
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取影像统计失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像统计失败"
        )


@router.patch("/{file_id}/exam-type", response_model=dict, summary="修改影像检查类型")
async def update_exam_type(
    file_id: int,
    request: UpdateExamTypeRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    修改影像检查类型（description 字段，如正位/侧位）。
    已处理或有标注的影像仍可修改，但会在响应中附带警告提示。
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()

        if not image:
            raise HTTPException(status_code=404, detail="影像文件不存在")

        warning = None
        if image.status == ImageFileStatusEnum.PROCESSED:
            warning = "该影像已完成AI分析，修改检查类型可能影响结果解读"
        elif image.annotation:
            warning = "该影像已有标注数据，修改检查类型可能影响标注关联"

        image.description = request.description
        image.updated_at = func.now()
        db.commit()
        db.refresh(image)

        logger.emit_event(LogLevel.INFO, message=f"用户 {current_user.get('username')} 将影像 {file_id} 检查类型修改为 {request.description}")
        return success_response(
            data={"id": image.id, "description": image.description, "warning": warning},
            message="检查类型修改成功"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"修改检查类型失败: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="修改检查类型失败")


@router.patch("/{file_id}/annotation", response_model=dict, summary="更新影像文件的标注数据")
async def update_annotation(
    file_id: int,
    request: UpdateAnnotationRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新指定影像文件的标注数据
    
    标注数据以 JSON 对象格式存储
    """
    try:
        # 查询影像文件
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()
        
        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )
        
        # 更新标注数据
        image.annotation = request.annotation
        image.updated_at = func.now()
        db.commit()
        db.refresh(image)
        
        logger.emit_event(LogLevel.INFO, message=f"用户 {current_user.get('username')} 更新了影像文件 {file_id} 的标注数据")
        
        uploader_name, patient_name = _image_file_related_names(db, image)

        return success_response(
            data=_image_file_response(
                image,
                uploader_name=uploader_name,
                patient_name=patient_name,
            ).dict(),
            message="标注数据更新成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"更新标注数据失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新标注数据失败"
        )
