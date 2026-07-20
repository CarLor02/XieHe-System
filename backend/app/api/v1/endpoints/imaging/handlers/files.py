"""
影像文件管理API

提供影像文件的查询、列表、下载等功能
支持按用户、患者、日期等条件查询

作者: XieHe Medical System
创建时间: 2026-01-05
"""

import json
from typing import Any, NamedTuple, Optional
from datetime import datetime, date, timedelta, timezone
from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status as http_status,
)
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, func

from app.core.database.session import get_db
from app.core.access.auth import get_current_active_user
from app.core.config import settings
from app.core.system.concurrency import require_ai_object_slot, require_batch_presign_slot
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response, paginated_response
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTeamVisibility, ImageFileTypeEnum
from app.models.patient import Patient
from app.models.user import User
from app.models.image import ImageAnnotation
from app.models.team import Team, TeamMembership, TeamMembershipRole, TeamMembershipStatus
from app.services.storage_gateway import StorageServiceError, storage_gateway
from app.services.ai_model_client import (
    AiModelClient,
    AiModelRequestError,
    ai_model_client,
)
from app.services.image_file_visibility import (
    apply_image_visibility_filter,
    get_visible_image_file,
    get_visible_image_uploader_ids,
    normalize_team_ids,
    replace_image_team_visibility,
    validate_assignable_team_ids,
)
from ..schemas.files import (
    BatchDownloadUrlsRequest,
    ImageFileResponse,
    ImageUploaderResponse,
    ImageFileStatsResponse,
    UpdateImageInfoRequest,
    UpdateExamTypeRequest,
    UpdateAnnotationRequest,
)

router = APIRouter()

READY_FOR_MODEL_STATUSES = {
    ImageFileStatusEnum.UPLOADED,
    ImageFileStatusEnum.PROCESSED,
}

REPLACE_CONTENT_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".tiff", ".tif"}
REPLACE_CONTENT_ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/tiff",
    "image/x-tiff",
}


class ImageFileRelatedMetadata(NamedTuple):
    uploader_name: Optional[str]
    patient_name: Optional[str]
    patient_identifier: Optional[str]
    patient_gender: Optional[str]
    patient_age: Optional[int]


async def start_ai_object_client(
    async_transport=None,
) -> None:
    global ai_model_client
    if async_transport is not None:
        await ai_model_client.stop()
        ai_model_client = AiModelClient(transport=async_transport)
    await ai_model_client.start()


async def stop_ai_object_client() -> None:
    await ai_model_client.stop()


def _image_file_response(
    image: ImageFile,
    uploader_name: Optional[str] = None,
    patient_name: Optional[str] = None,
    patient_identifier: Optional[str] = None,
    patient_gender: Optional[str] = None,
    patient_age: Optional[int] = None,
) -> ImageFileResponse:
    team_visibilities = sorted(
        image.team_visibilities,
        key=lambda visibility: visibility.team_id,
    )

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
        patient_identifier=patient_identifier,
        patient_gender=patient_gender,
        patient_age=patient_age,
        team_ids=[visibility.team_id for visibility in team_visibilities],
        team_names=[
            visibility.team.name
            for visibility in team_visibilities
            if visibility.team is not None and visibility.team.name
        ],
        study_date=image.study_date,
        description=image.description,
        annotation=image.annotation,
        status=image.status.value,
        upload_progress=image.upload_progress,
        created_at=image.created_at,
        uploaded_at=image.uploaded_at,
    )


def _extract_current_user_id(current_user: dict[str, Any]) -> Optional[int]:
    value = current_user.get("id") or current_user.get("user_id")
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _can_choose_image_uploader(db: Session, current_user: dict[str, Any]) -> bool:
    if current_user.get("is_superuser", False) or current_user.get("is_system_admin", False):
        return True

    user_id = _extract_current_user_id(current_user)
    if user_id is None:
        return False

    return (
        db.query(TeamMembership.id)
        .filter(
            TeamMembership.user_id == user_id,
            TeamMembership.role == TeamMembershipRole.ADMIN,
            TeamMembership.status == TeamMembershipStatus.ACTIVE,
        )
        .first()
        is not None
    )


def _user_to_uploader_response(user: User) -> ImageUploaderResponse:
    department_name = user.department.name if user.department else None
    return ImageUploaderResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        real_name=user.real_name,
        department=department_name,
        position=user.position,
        title=user.title,
        is_system_admin=bool(user.is_system_admin),
        system_admin_level=user.system_admin_level or 0,
    )


def _image_file_related_metadata(
    db: Session,
    image: ImageFile,
) -> ImageFileRelatedMetadata:
    uploader_name = None
    patient_name = None
    patient_identifier = None
    patient_gender = None
    patient_age = None

    if image.uploaded_by:
        uploader_name = db.query(User.real_name).filter(User.id == image.uploaded_by).scalar()

    if image.patient_id:
        patient_row = (
            db.query(
                Patient.name,
                Patient.patient_id,
                Patient.gender,
                Patient.age,
            )
            .filter(Patient.id == image.patient_id)
            .first()
        )
        if patient_row is not None:
            patient_name = patient_row[0]
            patient_identifier = patient_row[1]
            gender = patient_row[2]
            patient_gender = gender.value if hasattr(gender, "value") else gender
            patient_age = patient_row[3]

    return ImageFileRelatedMetadata(
        uploader_name=uploader_name,
        patient_name=patient_name,
        patient_identifier=patient_identifier,
        patient_gender=patient_gender,
        patient_age=patient_age,
    )


def _parse_team_ids_param(value: Optional[str]) -> list[int]:
    if not value:
        return []
    try:
        return normalize_team_ids([int(item) for item in value.split(",") if item.strip()])
    except ValueError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="team_ids 参数格式错误",
        )


def _parse_team_ids_form(value: Optional[str]) -> Optional[list[int]]:
    if value is None or not isinstance(value, str):
        return None
    try:
        payload = json.loads(value)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="team_ids 参数格式错误",
        )
    if not isinstance(payload, list):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="team_ids 参数格式错误",
        )
    try:
        return normalize_team_ids([int(item) for item in payload])
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="team_ids 参数格式错误",
        )


def _update_image_info(
    db: Session,
    image: ImageFile,
    current_user: dict[str, Any],
    *,
    description: Optional[str],
    team_ids: Optional[list[int]],
) -> None:
    if description is not None:
        image.description = description

    if team_ids is not None:
        validated_team_ids = validate_assignable_team_ids(db, current_user, team_ids)
        replace_image_team_visibility(db, image, validated_team_ids)

    image.updated_at = datetime.now()


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


def _team_to_assignable_response(
    team: Team,
    current_user_id: Optional[int],
    membership: Optional[TeamMembership] = None,
) -> dict[str, Any]:
    active_memberships = [
        item
        for item in team.memberships
        if item.status == TeamMembershipStatus.ACTIVE
    ]
    current_membership = membership
    if current_membership is None and current_user_id is not None:
        current_membership = next(
            (
                item
                for item in active_memberships
                if item.user_id == current_user_id
            ),
            None,
        )

    return {
        "id": team.id,
        "name": team.name,
        "description": team.description,
        "hospital": team.hospital,
        "department": team.department,
        "creator_name": team.creator.real_name if team.creator else None,
        "member_count": len(active_memberships),
        "max_members": team.max_members,
        "is_member": current_membership is not None,
        "my_role": _enum_value(current_membership.role) if current_membership else None,
        "my_status": _enum_value(current_membership.status) if current_membership else None,
        "is_creator": current_user_id is not None and team.creator_id == current_user_id,
        "join_status": None,
        "join_request_id": None,
        "created_at": team.created_at,
    }


def _determine_replacement_file_type(filename: str) -> ImageFileTypeEnum:
    ext = Path(filename).suffix.lower()
    if ext in {".jpg", ".jpeg"}:
        return ImageFileTypeEnum.JPEG
    if ext == ".png":
        return ImageFileTypeEnum.PNG
    if ext in {".tif", ".tiff"}:
        return ImageFileTypeEnum.TIFF
    return ImageFileTypeEnum.OTHER


def _validate_replacement_file(filename: str, content_type: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in REPLACE_CONTENT_ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件扩展名",
        )
    if content_type not in REPLACE_CONTENT_ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=http_status.HTTP_400_BAD_REQUEST,
            detail="不支持的文件类型",
        )


def _is_lateral_image(image: ImageFile) -> bool:
    return image.description == "侧位X光片"


def _model_object_payload(image: ImageFile) -> dict[str, str]:
    return AiModelClient.object_payload(image)


def _get_ai_object_url(image: ImageFile, operation: str) -> str:
    if operation != "predict":
        raise ValueError(f"unsupported AI operation: {operation}")
    try:
        return AiModelClient.measurement_url(image)
    except AiModelRequestError as exc:
        raise HTTPException(status_code=exc.status_code, detail=str(exc)) from exc


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
        return await ai_model_client.post(url, payload)
    except AiModelRequestError as exc:
        logger.emit_event(LogLevel.ERROR, message=f"AI模型 object 请求失败: {exc}")
        raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc


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
    uploaded_by: Optional[int] = Query(None, description="上传者用户ID"),
    team_ids: Optional[str] = Query(None, description="团队ID筛选，逗号分隔"),
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
        selected_team_ids = _parse_team_ids_param(team_ids)

        # 构建查询
        query = db.query(
            ImageFile,
            Patient.name.label("patient_name"),
            Patient.patient_id.label("patient_identifier"),
            User.real_name.label("uploader_name"),
        ).outerjoin(
            Patient, ImageFile.patient_id == Patient.id
        ).outerjoin(
            User, ImageFile.uploaded_by == User.id
        ).options(
            selectinload(ImageFile.team_visibilities).selectinload(
                ImageFileTeamVisibility.team
            )
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

        if uploaded_by is not None:
            query = query.filter(ImageFile.uploaded_by == uploaded_by)

        if selected_team_ids:
            team_visibility_exists = (
                db.query(ImageFileTeamVisibility.image_file_id)
                .filter(
                    ImageFileTeamVisibility.image_file_id == ImageFile.id,
                    ImageFileTeamVisibility.team_id.in_(selected_team_ids),
                )
                .exists()
            )
            query = query.filter(team_visibility_exists)

        # 分页
        total = query.count()
        image_rows = query.order_by(ImageFile.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

        items = [
            _image_file_response(
                image,
                uploader_name=uploader_name,
                patient_name=patient_name,
                patient_identifier=patient_identifier,
            ).dict()
            for image, patient_name, patient_identifier, uploader_name in image_rows
        ]

        return paginated_response(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            message="影像文件列表查询成功"
        )

    except HTTPException:
        raise
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
            Patient.patient_id.label("patient_identifier"),
            User.real_name.label("uploader_name"),
        ).outerjoin(
            Patient, ImageFile.patient_id == Patient.id
        ).outerjoin(
            User, ImageFile.uploaded_by == User.id
        ).options(
            selectinload(ImageFile.team_visibilities).selectinload(
                ImageFileTeamVisibility.team
            )
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
                patient_identifier=patient_identifier,
            ).dict()
            for image, patient_name, patient_identifier, uploader_name in image_rows
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


@router.get("/uploaders", response_model=dict, summary="获取当前可见影像上传者")
async def list_visible_image_uploaders(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索姓名、用户名或邮箱"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取“上传者视角”可选择的用户列表。"""
    if not _can_choose_image_uploader(db, current_user):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="无权查看上传者列表",
        )

    visible_uploader_ids = get_visible_image_uploader_ids(db, current_user)
    query = db.query(User).filter(
        User.is_deleted == False,
        User.status == "active",
    )

    if visible_uploader_ids is not None:
        query = query.filter(User.id.in_(visible_uploader_ids))

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                User.real_name.ilike(search_pattern),
                User.username.ilike(search_pattern),
                User.email.ilike(search_pattern),
            )
        )

    total = query.count()
    users = (
        query.order_by(User.id.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return paginated_response(
        items=[_user_to_uploader_response(user).dict() for user in users],
        total=total,
        page=page,
        page_size=page_size,
        message="上传者列表查询成功",
    )


@router.get("/assignable-teams", response_model=dict, summary="获取可设置为影像归属的团队")
async def list_assignable_image_teams(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索团队名、医院、科室或描述"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """获取上传或编辑影像时可选择的归属团队。"""
    user_id = _extract_current_user_id(current_user)
    can_manage_all = current_user.get("is_superuser", False) or current_user.get(
        "is_system_admin",
        False,
    )

    if can_manage_all:
        query = db.query(Team).filter(Team.is_active == True)
    else:
        if user_id is None:
            return paginated_response(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                message="可归属团队列表查询成功",
            )
        query = (
            db.query(Team, TeamMembership)
            .join(TeamMembership, TeamMembership.team_id == Team.id)
            .filter(
                Team.is_active == True,
                TeamMembership.user_id == user_id,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
            )
        )

    if search:
        search_pattern = f"%{search.strip()}%"
        query = query.filter(
            or_(
                Team.name.ilike(search_pattern),
                Team.description.ilike(search_pattern),
                Team.hospital.ilike(search_pattern),
                Team.department.ilike(search_pattern),
            )
        )

    total = query.count()
    rows = (
        query.order_by(Team.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    if can_manage_all:
        items = [
            _team_to_assignable_response(team, user_id)
            for team in rows
        ]
    else:
        items = [
            _team_to_assignable_response(team, user_id, membership)
            for team, membership in rows
        ]

    return paginated_response(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        message="可归属团队列表查询成功",
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
        
        related_metadata = _image_file_related_metadata(
            db,
            image,
        )

        return success_response(
            data=_image_file_response(
                image,
                uploader_name=related_metadata.uploader_name,
                patient_name=related_metadata.patient_name,
                patient_identifier=related_metadata.patient_identifier,
                patient_gender=related_metadata.patient_gender,
                patient_age=related_metadata.patient_age,
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

        # 删除权限与影像可见性保持一致：系统管理员可操作全部，
        # 团队管理员可操作团队内影像，普通成员只能操作自己上传的影像。
        if get_visible_image_file(db, file_id, current_user) is None:
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


@router.patch("/{file_id}/content", response_model=dict, summary="替换影像文件内容")
async def replace_image_file_content(
    file_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    team_ids: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """
    使用新的图片内容覆盖当前影像对象，保持 image_files.id 不变。

    裁剪/翻转会改变图像坐标系，因此替换成功后清空 image_files.annotation
    以及旧的 image_annotations 记录，避免旧标注坐标继续显示在新图上。
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False,
        ).first()

        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在",
            )

        # 内容替换会清空标注，权限边界必须与影像可见性一致。
        if get_visible_image_file(db, file_id, current_user) is None:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN,
                detail="无权替换此文件",
            )

        parsed_team_ids = _parse_team_ids_form(team_ids)
        parsed_description = description if isinstance(description, str) else None
        if parsed_team_ids is not None:
            validate_assignable_team_ids(db, current_user, parsed_team_ids)

        filename = file.filename or image.original_filename
        content_type = (
            file.content_type
            or image.mime_type
            or "application/octet-stream"
        )
        _validate_replacement_file(filename, content_type)

        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="替换文件不能为空",
            )

        upload_result = await storage_gateway.put_object(
            bucket=image.storage_bucket,
            object_key=image.object_key,
            data=content,
            content_type=content_type,
        )

        image.original_filename = filename
        image.file_type = _determine_replacement_file_type(filename)
        image.mime_type = content_type
        image.file_size = len(content)
        image.file_hash = None
        image.storage_etag = upload_result.get("etag")
        image.thumbnail_path = None
        _update_image_info(
            db,
            image,
            current_user,
            description=parsed_description,
            team_ids=parsed_team_ids,
        )
        image.annotation = None
        image.status = ImageFileStatusEnum.UPLOADED
        image.upload_progress = 100
        image.uploaded_at = datetime.now()

        db.query(ImageAnnotation).filter(
            ImageAnnotation.image_file_id == image.id
        ).delete(synchronize_session=False)

        db.commit()
        db.refresh(image)

        logger.emit_event(
            LogLevel.INFO,
            message=f"用户 {current_user.get('username')} 替换了影像文件 {file_id} 的内容",
        )

        related_metadata = _image_file_related_metadata(
            db,
            image,
        )
        return success_response(
            data=_image_file_response(
                image,
                uploader_name=related_metadata.uploader_name,
                patient_name=related_metadata.patient_name,
                patient_identifier=related_metadata.patient_identifier,
                patient_gender=related_metadata.patient_gender,
                patient_age=related_metadata.patient_age,
            ).dict(),
            message="影像内容替换成功",
        )

    except PermissionError as e:
        db.rollback()
        raise HTTPException(status_code=http_status.HTTP_403_FORBIDDEN, detail=str(e))
    except HTTPException:
        raise
    except StorageServiceError as e:
        logger.emit_event(LogLevel.ERROR, message=f"替换影像内容失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_502_BAD_GATEWAY,
            detail="对象存储服务不可用",
        )
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"替换影像内容失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="替换影像内容失败",
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


@router.patch("/{file_id}/info", response_model=dict, summary="修改影像信息")
async def update_image_info(
    file_id: int,
    request: UpdateImageInfoRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db),
):
    """修改影像检查类型和团队归属。"""
    try:
        image = get_visible_image_file(db, file_id, current_user)
        if not image:
            raise HTTPException(status_code=404, detail="影像文件不存在")

        warning = None
        if image.status == ImageFileStatusEnum.PROCESSED:
            warning = "该影像已完成AI分析，修改检查类型可能影响结果解读"
        elif image.annotation:
            warning = "该影像已有标注数据，修改检查类型可能影响标注关联"

        _update_image_info(
            db,
            image,
            current_user,
            description=request.description,
            team_ids=request.team_ids,
        )
        db.commit()
        db.refresh(image)

        related_metadata = _image_file_related_metadata(
            db,
            image,
        )
        payload = _image_file_response(
            image,
            uploader_name=related_metadata.uploader_name,
            patient_name=related_metadata.patient_name,
            patient_identifier=related_metadata.patient_identifier,
            patient_gender=related_metadata.patient_gender,
            patient_age=related_metadata.patient_age,
        ).dict()
        payload["warning"] = warning
        return success_response(data=payload, message="影像信息修改成功")
    except PermissionError as exc:
        db.rollback()
        raise HTTPException(status_code=403, detail=str(exc))
    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"修改影像信息失败: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="修改影像信息失败")


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
        image = get_visible_image_file(db, file_id, current_user)
        if not image:
            raise HTTPException(status_code=404, detail="影像文件不存在")

        warning = None
        if image.status == ImageFileStatusEnum.PROCESSED:
            warning = "该影像已完成AI分析，修改检查类型可能影响结果解读"
        elif image.annotation:
            warning = "该影像已有标注数据，修改检查类型可能影响标注关联"

        _update_image_info(
            db,
            image,
            current_user,
            description=request.description,
            team_ids=None,
        )
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
        
        related_metadata = _image_file_related_metadata(
            db,
            image,
        )

        return success_response(
            data=_image_file_response(
                image,
                uploader_name=related_metadata.uploader_name,
                patient_name=related_metadata.patient_name,
                patient_identifier=related_metadata.patient_identifier,
                patient_gender=related_metadata.patient_gender,
                patient_age=related_metadata.patient_age,
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
