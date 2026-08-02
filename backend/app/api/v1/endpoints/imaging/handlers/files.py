"""
影像文件管理API

提供影像文件的查询、列表、下载等功能
支持按用户、患者、日期等条件查询

作者: XieHe Medical System
创建时间: 2026-01-05
"""

import json
import typing
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, NamedTuple, Optional

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Query,
    Response,
    UploadFile,
)
from fastapi import (
    status as http_status,
)
from fastapi.responses import RedirectResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session, defer, selectinload

from app.contexts.imaging.application import (
    AnnotationApplicationService,
    ImageVisibilityApplicationService,
)
from app.contexts.imaging.domain import (
    AnnotationMutationReason,
    AnnotationSource,
    normalize_team_ids,
)
from app.contexts.imaging.infrastructure import (
    SqlAlchemyAnnotationRepository,
    apply_image_access_scope,
)
from app.contexts.imaging.interface.actor import image_access_actor
from app.contexts.imaging.interface.dependencies import (
    build_image_visibility_service,
    build_imaging_query_service,
)
from app.core.access.auth import get_current_active_user
from app.core.config import settings
from app.core.database.session import get_db
from app.core.system.concurrency import (
    require_ai_object_slot,
    require_batch_presign_slot,
)
from app.core.system.logger import LogLevel, logger
from app.core.system.response import paginated_response, success_response
from app.models.image_file import (
    ImageFile,
    ImageFileStatusEnum,
    ImageFileTeamVisibility,
    ImageFileTypeEnum,
)
from app.models.patient import Patient
from app.models.team import (
    Team,
    TeamMembership,
    TeamMembershipStatus,
)
from app.models.user import User
from app.services.ai_model_client import (
    AiModelClient,
    AiModelRequestError,
    ai_model_client,
)
from app.shared.storage import StorageServiceError, storage_service_client

from ..schemas.files import (
    BatchDownloadUrlsRequest,
    ImageFileResponse,
    ImageFileStatsResponse,
    ImageUploaderResponse,
    RenameImageFileRequest,
    UpdateExamTypeRequest,
    UpdateImageInfoRequest,
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


def _visibility_service(db: Session) -> ImageVisibilityApplicationService:
    """旧路由迁移期间统一从 imaging context 获取可见性应用服务。"""

    return build_image_visibility_service(db)


def get_visible_image_file(
    db: Session,
    file_id: int,
    current_user: dict[str, Any],
) -> ImageFile | None:
    """兼容旧路由内部调用；访问规则由 imaging application 执行。"""

    return _visibility_service(db).get_visible_image(
        file_id,
        image_access_actor(current_user),
    )


def get_visible_image_uploader_ids(
    db: Session,
    current_user: dict[str, Any],
) -> list[int] | None:
    return _visibility_service(db).list_visible_uploader_ids(
        image_access_actor(current_user)
    )


def validate_assignable_team_ids(
    db: Session,
    current_user: dict[str, Any],
    team_ids: list[int] | None,
) -> list[int]:
    return _visibility_service(db).validate_assignable_team_ids(
        image_access_actor(current_user),
        team_ids,
    )


def replace_image_team_visibility(
    db: Session,
    image: ImageFile,
    team_ids: list[int],
) -> None:
    _visibility_service(db).replace_team_visibility(image, team_ids)


def _apply_visibility_to_legacy_query(
    query: typing.Any,
    db: Session,
    current_user: dict[str, Any],
) -> typing.Any:
    """仅供尚未迁出旧文件的复合查询使用，不承载领域规则。"""

    scope = _visibility_service(db).resolve_scope(image_access_actor(current_user))
    return apply_image_access_scope(query, scope)


class ImageFileRelatedMetadata(NamedTuple):
    uploader_name: Optional[str]
    patient_name: Optional[str]
    patient_identifier: Optional[str]
    patient_gender: Optional[str]
    patient_age: Optional[int]


async def start_ai_object_client(
    async_transport: typing.Any = None,
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
    include_annotation: bool = True,
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
        annotation=image.annotation if include_annotation else None,
        annotation_version=int(image.annotation_version or 0),
        has_annotation=bool(image.has_annotation),
        annotation_created_at=image.annotation_created_at,
        annotation_created_by=image.annotation_created_by,
        annotation_updated_at=image.annotation_updated_at,
        annotation_updated_by=image.annotation_updated_by,
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
    return _visibility_service(db).can_choose_uploader(image_access_actor(current_user))


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
        uploader_name = (
            db.query(User.real_name).filter(User.id == image.uploaded_by).scalar()
        )

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
        return normalize_team_ids(
            [int(item) for item in value.split(",") if item.strip()]
        )
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
) -> dict[str, typing.Any]:
    return {
        "url": url,
        "expires_in": expires_in,
        "expires_at": (
            datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        ).isoformat(),
        "filename": image.original_filename,
        "mime_type": image.mime_type,
        "etag": image.storage_etag,
    }


def _build_renamed_filename(original_filename: str, basename: str) -> str:
    """保留真实文件扩展名，避免展示名与 MIME/文件内容产生格式冲突。"""

    suffix = Path(original_filename).suffix
    renamed_filename = f"{basename}{suffix}"
    if len(renamed_filename) > 255:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="新影像名过长",
        )
    return renamed_filename


def _get_visible_image_files_by_ids(
    db: Session,
    file_ids: list[int],
    current_user: dict[str, Any],
) -> dict[int, ImageFile]:
    return _visibility_service(db).get_visible_images_by_ids(
        file_ids,
        image_access_actor(current_user),
    )


def _enum_value(value: Any) -> str:
    return str(value.value) if hasattr(value, "value") else str(value)


def _team_to_assignable_response(
    team: Team,
    current_user_id: Optional[int],
    membership: Optional[TeamMembership] = None,
) -> dict[str, Any]:
    active_memberships = [
        item for item in team.memberships if item.status == TeamMembershipStatus.ACTIVE
    ]
    current_membership = membership
    if current_membership is None and current_user_id is not None:
        current_membership = next(
            (item for item in active_memberships if item.user_id == current_user_id),
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
        "my_status": _enum_value(current_membership.status)
        if current_membership
        else None,
        "is_creator": current_user_id is not None
        and team.creator_id == current_user_id,
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
@router.get("/patient/{patient_id}", response_model=dict, summary="获取患者的影像文件")
async def get_patient_images(
    patient_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> typing.Any:
    """
    获取指定患者的所有影像文件
    """
    try:
        # 构建查询
        query = (
            db.query(
                ImageFile,
                Patient.name.label("patient_name"),
                Patient.patient_id.label("patient_identifier"),
                User.real_name.label("uploader_name"),
            )
            .outerjoin(Patient, ImageFile.patient_id == Patient.id)
            .outerjoin(User, ImageFile.uploaded_by == User.id)
            .options(
                defer(ImageFile.annotation),
                selectinload(ImageFile.team_visibilities).selectinload(
                    ImageFileTeamVisibility.team
                ),
            )
            .filter(ImageFile.patient_id == patient_id, ImageFile.is_deleted.is_(False))
        )
        query = _apply_visibility_to_legacy_query(query, db, current_user)

        total = query.count()
        image_rows = (
            query.order_by(ImageFile.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        items = [
            _image_file_response(
                image,
                uploader_name=uploader_name,
                patient_name=patient_name,
                patient_identifier=patient_identifier,
                include_annotation=False,
            ).dict()
            for image, patient_name, patient_identifier, uploader_name in image_rows
        ]

        return paginated_response(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            message="患者影像文件查询成功",
        )

    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取患者影像文件失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取患者影像文件失败",
        )


@router.get("/uploaders", response_model=dict, summary="获取当前可见影像上传者")
async def list_visible_image_uploaders(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索姓名、用户名或邮箱"),
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> typing.Any:
    """获取“上传者视角”可选择的用户列表。"""
    if not _can_choose_image_uploader(db, current_user):
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="无权查看上传者列表",
        )

    visible_uploader_ids = get_visible_image_uploader_ids(db, current_user)
    query = db.query(User).filter(
        User.is_deleted.is_(False),
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


@router.get(
    "/assignable-teams", response_model=dict, summary="获取可设置为影像归属的团队"
)
async def list_assignable_image_teams(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=50, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索团队名、医院、科室或描述"),
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> typing.Any:
    """获取上传或编辑影像时可选择的归属团队。"""
    user_id = _extract_current_user_id(current_user)
    can_manage_all = current_user.get("is_superuser", False) or current_user.get(
        "is_system_admin",
        False,
    )

    query: Any
    if can_manage_all:
        query = db.query(Team).filter(Team.is_active.is_(True))
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
                Team.is_active.is_(True),
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
        items = [_team_to_assignable_response(team, user_id) for team in rows]
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
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    _slot: None = Depends(require_ai_object_slot),
) -> typing.Any:
    image = _get_ai_ready_visible_image(db, file_id, current_user)
    return await _post_ai_object_request(
        _get_ai_object_url(image, "predict"),
        _model_object_payload(image),
    )


@router.get("/{file_id}/download-url", summary="获取影像文件临时访问地址")
async def get_image_file_download_url(
    file_id: int,
    response: Response,
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
    """
    获取经 Nginx 代理的 MinIO presigned URL。
    """
    try:
        image = get_visible_image_file(db, file_id, current_user)

        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
            )

        if image.status not in {
            ImageFileStatusEnum.UPLOADED,
            ImageFileStatusEnum.PROCESSED,
        }:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="影像文件尚未完成上传",
            )

        expires_in = settings.STORAGE_PRESIGN_EXPIRES_SECONDS
        url = await storage_service_client.presign_get(
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
            detail="获取影像访问地址失败",
        )


@router.post("/download-urls", summary="批量获取影像文件临时访问地址")
async def get_image_file_download_urls(
    request: BatchDownloadUrlsRequest,
    response: Response,
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    _slot: None = Depends(require_batch_presign_slot),
) -> dict[str, typing.Any]:
    """
    批量获取经 Nginx 代理的 MinIO presigned URL。
    """
    expires_in = settings.STORAGE_PRESIGN_EXPIRES_SECONDS
    _set_presign_cache_headers(response, expires_in)

    items: dict[int, dict[str, typing.Any]] = {}
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

        if image.status not in {
            ImageFileStatusEnum.UPLOADED,
            ImageFileStatusEnum.PROCESSED,
        }:
            errors[file_id] = {
                "code": "not_ready",
                "message": "影像文件尚未完成上传",
            }
            continue

        try:
            url = await storage_service_client.presign_get(
                bucket=image.storage_bucket,
                object_key=image.object_key,
                expires_in=expires_in,
            )
        except StorageServiceError as exc:
            logger.emit_event(
                LogLevel.ERROR, message=f"批量获取影像访问地址失败: {exc}"
            )
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
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> RedirectResponse:
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
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
    """
    软删除指定的影像文件
    """
    try:
        image = (
            db.query(ImageFile)
            .filter(ImageFile.id == file_id, ImageFile.is_deleted.is_(False))
            .first()
        )

        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
            )

        # 删除权限与影像可见性保持一致：系统管理员可操作全部，
        # 团队管理员可操作团队内影像，普通成员只能操作自己上传的影像。
        if get_visible_image_file(db, file_id, current_user) is None:
            raise HTTPException(
                status_code=http_status.HTTP_403_FORBIDDEN, detail="无权删除此文件"
            )

        # 软删除
        image.is_deleted = True
        image.deleted_at = datetime.now()
        image.deleted_by = current_user.get("id")

        db.commit()

        return success_response(data={"file_id": file_id}, message="影像文件已删除")

    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"删除影像文件失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除影像文件失败",
        )


@router.patch("/{file_id}/content", response_model=dict, summary="替换影像文件内容")
async def replace_image_file_content(
    file_id: int,
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    team_ids: Optional[str] = Form(None),
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
    """
    使用新的图片内容覆盖当前影像对象，保持 image_files.id 不变。

    裁剪/翻转会改变图像坐标系，因此替换成功后通过统一标注写入流程清空标注，
    同时保留可审计的内容替换 revision。
    """
    try:
        image = (
            db.query(ImageFile)
            .filter(
                ImageFile.id == file_id,
                ImageFile.is_deleted.is_(False),
            )
            .first()
        )

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
            file.content_type or image.mime_type or "application/octet-stream"
        )
        _validate_replacement_file(filename, content_type)

        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="替换文件不能为空",
            )

        upload_result = await storage_service_client.put_object(
            bucket=image.storage_bucket,
            object_key=image.object_key,
            data=content,
            content_type=content_type,
        )

        annotation_repository = SqlAlchemyAnnotationRepository(db)
        locked_image = annotation_repository.get_for_update(file_id)
        if locked_image is None:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在",
            )
        image = locked_image

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
        image.upload_progress = 100
        image.uploaded_at = datetime.now()
        AnnotationApplicationService(
            annotation_repository,
            _visibility_service(db),
        ).save_locked_image(
            image=image,
            actor_id=_extract_current_user_id(current_user),
            annotation={},
            source=AnnotationSource.SYSTEM,
            reason=AnnotationMutationReason.CONTENT_REPLACEMENT,
            force_revision=True,
        )

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
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
    """
    获取当前用户可见范围内的影像文件统计信息
    """
    try:
        stats = build_imaging_query_service(db).get_image_stats(
            image_access_actor(current_user)
        )

        return success_response(
            data=ImageFileStatsResponse(**stats).dict(),
            message="影像统计查询成功",
        )

    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取影像统计失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像统计失败",
        )


@router.patch("/{file_id}/info", response_model=dict, summary="修改影像信息")
async def update_image_info(
    file_id: int,
    request: UpdateImageInfoRequest,
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
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


@router.patch("/{file_id}/filename", response_model=dict, summary="重命名影像文件")
async def rename_image_file(
    file_id: int,
    request: RenameImageFileRequest,
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
    """只修改用户可见文件名；对象存储 Key、文件内容和标注数据保持不变。"""

    try:
        image = get_visible_image_file(db, file_id, current_user)
        if not image:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在",
            )

        image.original_filename = _build_renamed_filename(
            image.original_filename,
            request.basename,
        )
        image.updated_at = datetime.now()
        db.commit()
        db.refresh(image)

        related_metadata = _image_file_related_metadata(db, image)
        return success_response(
            data=_image_file_response(
                image,
                uploader_name=related_metadata.uploader_name,
                patient_name=related_metadata.patient_name,
                patient_identifier=related_metadata.patient_identifier,
                patient_gender=related_metadata.patient_gender,
                patient_age=related_metadata.patient_age,
            ).dict(),
            message="影像重命名成功",
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"影像重命名失败: {exc}")
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="影像重命名失败",
        )


@router.patch("/{file_id}/exam-type", response_model=dict, summary="修改影像检查类型")
async def update_exam_type(
    file_id: int,
    request: UpdateExamTypeRequest,
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
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

        logger.emit_event(
            LogLevel.INFO,
            message=f"用户 {current_user.get('username')} 将影像 {file_id} 检查类型修改为 {request.description}",
        )
        return success_response(
            data={"id": image.id, "description": image.description, "warning": warning},
            message="检查类型修改成功",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"修改检查类型失败: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail="修改检查类型失败")
