"""单文件影像上传 HTTP 接口。"""

from dataclasses import asdict

from fastapi import APIRouter, Depends, Query

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.imaging.application import ImageUploadService
from app.contexts.imaging.application.dto import (
    CompleteUpload,
    MultipartPart,
    UploadFileSpec,
)
from app.contexts.imaging.application.errors import (
    AuthenticationRequiredError,
    ImageAccessDeniedError,
    ImageUploadSessionNotFoundError,
    InvalidImageOperationError,
    ObjectStorageUnavailableError,
    PatientNotFoundError,
)
from app.contexts.imaging.domain import (
    ImageFileNotFoundError,
    ImageTeamAssignmentDeniedError,
)
from app.core.system.response import paginated_response, success_response

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_image_upload_service
from ..errors import raise_http_error
from ..schemas import CompleteUploadSessionRequest, CreateUploadSessionRequest

router = APIRouter()

_UPLOAD_ERRORS = (
    AuthenticationRequiredError,
    ImageAccessDeniedError,
    ImageUploadSessionNotFoundError,
    ImageFileNotFoundError,
    ImageTeamAssignmentDeniedError,
    InvalidImageOperationError,
    ObjectStorageUnavailableError,
    PatientNotFoundError,
)


@router.post("/sessions", summary="创建影像上传会话")
async def create_upload_session(
    request: CreateUploadSessionRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageUploadService = Depends(get_image_upload_service),
) -> dict[str, object]:
    try:
        result = await service.create_session(
            UploadFileSpec(
                filename=request.filename,
                size=request.size,
                mime_type=request.mime_type,
                patient_id=request.patient_id,
                description=request.description,
                team_ids=request.team_ids,
                file_hash=request.file_hash,
            ),
            image_access_actor(current_user),
        )
    except _UPLOAD_ERRORS as exc:
        raise_http_error(exc)
    return success_response(data=asdict(result), message="上传会话创建成功")


@router.post("/sessions/{session_id}/complete", summary="完成影像上传")
async def complete_upload_session(
    session_id: str,
    request: CompleteUploadSessionRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageUploadService = Depends(get_image_upload_service),
) -> dict[str, object]:
    try:
        result = await service.complete_session(
            session_id,
            CompleteUpload(
                parts=[
                    MultipartPart(part_number=part.part_number, etag=part.etag)
                    for part in request.parts
                ],
                file_hash=request.file_hash,
            ),
            image_access_actor(current_user),
        )
    except _UPLOAD_ERRORS as exc:
        raise_http_error(exc)
    return success_response(data=asdict(result), message="文件上传完成")


@router.get("/sessions/{session_id}", summary="获取上传状态")
def get_upload_status(
    session_id: str,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageUploadService = Depends(get_image_upload_service),
) -> dict[str, object]:
    try:
        result = service.get_status(
            session_id,
            image_access_actor(current_user),
        )
    except _UPLOAD_ERRORS as exc:
        raise_http_error(exc)
    return success_response(data=asdict(result), message="获取上传状态成功")


@router.get("/records", summary="获取文件上传记录")
def get_upload_records(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    patient_id: int | None = None,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageUploadService = Depends(get_image_upload_service),
) -> dict[str, object]:
    try:
        result = service.list_records(
            actor=image_access_actor(current_user),
            page=page,
            page_size=page_size,
            patient_id=patient_id,
        )
    except _UPLOAD_ERRORS as exc:
        raise_http_error(exc)
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
        page=page,
        page_size=page_size,
        message="获取上传记录成功",
    )
