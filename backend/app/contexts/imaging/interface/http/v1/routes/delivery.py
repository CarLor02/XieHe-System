"""影像对象访问与下载接口。"""

from dataclasses import asdict

from fastapi import APIRouter, Depends, Response
from fastapi.responses import RedirectResponse

from app.contexts.imaging.application import ImageDeliveryService
from app.contexts.imaging.application.errors import (
    ImageNotReadyError,
    ObjectStorageUnavailableError,
)
from app.contexts.imaging.domain import ImageFileNotFoundError
from app.core.access.auth import get_current_active_user
from app.core.system.concurrency import require_batch_presign_slot
from app.core.system.response import success_response

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_image_delivery_service
from ..errors import raise_http_error
from ..schemas import BatchDownloadUrlsRequest

router = APIRouter()


def _set_presign_cache_headers(response: Response, expires_in: int) -> None:
    response.headers["Cache-Control"] = f"private, max-age={max(expires_in - 60, 0)}"
    response.headers["Vary"] = "Authorization"


@router.get("/{file_id}/download-url", summary="获取影像文件临时访问地址")
async def get_image_file_download_url(
    file_id: int,
    response: Response,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageDeliveryService = Depends(get_image_delivery_service),
) -> dict[str, object]:
    try:
        result = await service.get_download_url(
            file_id,
            image_access_actor(current_user),
        )
    except (
        ImageFileNotFoundError,
        ImageNotReadyError,
        ObjectStorageUnavailableError,
    ) as exc:
        raise_http_error(exc)
    _set_presign_cache_headers(response, result.expires_in)
    return success_response(data=asdict(result), message="获取影像访问地址成功")


@router.post("/download-urls", summary="批量获取影像文件临时访问地址")
async def get_image_file_download_urls(
    request: BatchDownloadUrlsRequest,
    response: Response,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageDeliveryService = Depends(get_image_delivery_service),
    _slot: None = Depends(require_batch_presign_slot),
) -> dict[str, object]:
    result = await service.get_download_urls(
        request.ids,
        image_access_actor(current_user),
    )
    expires_in = next(
        (item.expires_in for item in result.items.values()),
        0,
    )
    if expires_in:
        _set_presign_cache_headers(response, expires_in)
    return success_response(
        data={
            "items": {key: asdict(value) for key, value in result.items.items()},
            "errors": {key: asdict(value) for key, value in result.errors.items()},
        },
        message="批量获取影像访问地址成功",
    )


@router.get("/{file_id}/download", summary="下载影像文件")
async def download_image_file(
    file_id: int,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageDeliveryService = Depends(get_image_delivery_service),
) -> RedirectResponse:
    try:
        result = await service.get_download_url(
            file_id,
            image_access_actor(current_user),
        )
    except (
        ImageFileNotFoundError,
        ImageNotReadyError,
        ObjectStorageUnavailableError,
    ) as exc:
        raise_http_error(exc)
    return RedirectResponse(url=result.url, status_code=307)
