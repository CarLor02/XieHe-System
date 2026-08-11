"""批量影像导入 HTTP 接口。"""

from dataclasses import asdict

from fastapi import APIRouter, Depends, Query

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.imaging.application import ImageImportService
from app.contexts.imaging.application.dto import (
    CompleteUpload,
    CreateImportBatch,
    ImportFileSpec,
    MultipartPart,
)
from app.contexts.imaging.application.errors import (
    AiTaskQueueUnavailableError,
    AuthenticationRequiredError,
    ImageImportNotFoundError,
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
from ..dependencies import get_image_import_service
from ..errors import raise_http_error
from ..schemas import (
    CompleteImageImportItemRequest,
    CreateImageImportBatchRequest,
    CreateImageImportSessionsRequest,
    MarkImageImportUploadFailedRequest,
)

router = APIRouter()

_IMPORT_ERRORS = (
    AiTaskQueueUnavailableError,
    AuthenticationRequiredError,
    ImageFileNotFoundError,
    ImageImportNotFoundError,
    ImageTeamAssignmentDeniedError,
    InvalidImageOperationError,
    ObjectStorageUnavailableError,
    PatientNotFoundError,
)


@router.get("/batches/config", summary="获取批量导入配置")
def get_image_import_config(
    _current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    return success_response(
        data={
            "max_files": service.configuration.max_files,
            "session_window_size": service.configuration.session_window_size,
        },
        message="批量导入配置查询成功",
    )


@router.post("/batches", summary="创建批量导入任务")
def create_image_import_batch(
    request: CreateImageImportBatchRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    try:
        result = service.create_batch(
            CreateImportBatch(
                patient_id=request.patient_id,
                description=request.description,
                team_ids=request.team_ids,
                files=[
                    ImportFileSpec(
                        client_file_id=file.client_file_id,
                        filename=file.filename,
                        size=file.size,
                        mime_type=file.mime_type,
                        file_hash=file.file_hash,
                    )
                    for file in request.files
                ],
            ),
            image_access_actor(current_user),
        )
    except _IMPORT_ERRORS as exc:
        raise_http_error(exc)
    return success_response(
        data={
            **asdict(result.batch),
            "items": [asdict(item) for item in result.items],
        },
        message="批量导入任务创建成功",
    )


@router.post("/batches/{batch_id}/sessions", summary="为批量导入项创建上传会话")
async def create_image_import_sessions(
    batch_id: str,
    request: CreateImageImportSessionsRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    try:
        items = await service.create_sessions(
            batch_id,
            request.item_ids,
            image_access_actor(current_user),
        )
    except _IMPORT_ERRORS as exc:
        raise_http_error(exc)
    return success_response(
        data={"items": [asdict(item) for item in items]},
        message="批量上传会话创建成功",
    )


@router.post(
    "/batches/{batch_id}/items/{item_id}/complete",
    summary="完成单个批量导入项并加入AI队列",
)
async def complete_image_import_item(
    batch_id: str,
    item_id: int,
    request: CompleteImageImportItemRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    try:
        result = await service.complete_item(
            batch_id,
            item_id,
            CompleteUpload(
                upload_id=request.upload_id,
                parts=[
                    MultipartPart(part_number=part.part_number, etag=part.etag)
                    for part in request.parts
                ],
                file_hash=request.file_hash,
            ),
            image_access_actor(current_user),
        )
    except _IMPORT_ERRORS as exc:
        raise_http_error(exc)
    return success_response(data=asdict(result.item), message=result.message)


@router.post(
    "/batches/{batch_id}/items/{item_id}/upload-failed",
    summary="记录单个批量导入项上传失败",
)
def mark_image_import_upload_failed(
    batch_id: str,
    item_id: int,
    request: MarkImageImportUploadFailedRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    try:
        result = service.mark_upload_failed(
            batch_id,
            item_id,
            request.error,
            image_access_actor(current_user),
        )
    except _IMPORT_ERRORS as exc:
        raise_http_error(exc)
    return success_response(data=asdict(result.item), message=result.message)


@router.post(
    "/batches/{batch_id}/items/{item_id}/enqueue",
    summary="重新提交批量导入AI任务",
)
async def enqueue_image_import_item(
    batch_id: str,
    item_id: int,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    try:
        result = await service.enqueue_item(
            batch_id,
            item_id,
            image_access_actor(current_user),
        )
    except _IMPORT_ERRORS as exc:
        raise_http_error(exc)
    return success_response(data=asdict(result.item), message=result.message)


@router.get("/batches", summary="查询批量导入任务")
def list_image_import_batches(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    batch_status: str | None = Query(None, alias="status"),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    try:
        result = service.list_batches(
            actor=image_access_actor(current_user),
            page=page,
            page_size=page_size,
            status=batch_status,
        )
    except _IMPORT_ERRORS as exc:
        raise_http_error(exc)
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
        page=page,
        page_size=page_size,
        message="批量导入任务查询成功",
    )


@router.get("/batches/{batch_id}/items", summary="查询批量导入项")
def list_image_import_items(
    batch_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageImportService = Depends(get_image_import_service),
) -> dict[str, object]:
    try:
        result = service.list_items(
            batch_id=batch_id,
            actor=image_access_actor(current_user),
            page=page,
            page_size=page_size,
        )
    except _IMPORT_ERRORS as exc:
        raise_http_error(exc)
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
        page=page,
        page_size=page_size,
        message="批量导入项查询成功",
    )
