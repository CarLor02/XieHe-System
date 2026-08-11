"""影像对象访问与下载地址用例。"""

from datetime import datetime, timedelta, timezone

from app.contexts.imaging.application.dto import (
    BatchDownloadUrls,
    DownloadError,
    DownloadUrl,
)
from app.contexts.imaging.application.errors import (
    ImageNotReadyError,
    ObjectStorageUnavailableError,
)
from app.contexts.imaging.domain import ImageAccessActor, ImageFileNotFoundError

from .image_status import READY_FILE_STATUSES
from .ports import ImageFileRecord, ImageFileRepository, ObjectStorage
from .visibility_service import ImageVisibilityApplicationService


class ImageDeliveryService:
    def __init__(
        self,
        repository: ImageFileRepository,
        visibility: ImageVisibilityApplicationService,
        storage: ObjectStorage,
        *,
        expires_in: int,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._storage = storage
        self._expires_in = expires_in

    async def get_download_url(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
    ) -> DownloadUrl:
        image = self._visible_ready_image(image_file_id, actor)
        url = await self._storage.presign_get(
            bucket=str(image.storage_bucket),
            object_key=str(image.object_key),
            expires_in=self._expires_in,
        )
        return self._download_url(image, url)

    async def get_download_urls(
        self,
        image_file_ids: list[int],
        actor: ImageAccessActor,
    ) -> BatchDownloadUrls:
        ordered_ids = list(dict.fromkeys(image_file_ids))
        scope = self._visibility.resolve_scope(actor)
        images = self._repository.list_visible_by_ids(ordered_ids, scope)
        items: dict[int, DownloadUrl] = {}
        errors: dict[int, DownloadError] = {}
        for image_file_id in ordered_ids:
            image = images.get(image_file_id)
            if image is None:
                errors[image_file_id] = DownloadError(
                    code="not_found",
                    message="影像文件不存在",
                )
                continue
            if image.status not in READY_FILE_STATUSES:
                errors[image_file_id] = DownloadError(
                    code="not_ready",
                    message="影像文件尚未完成上传",
                )
                continue
            try:
                url = await self._storage.presign_get(
                    bucket=str(image.storage_bucket),
                    object_key=str(image.object_key),
                    expires_in=self._expires_in,
                )
            except ObjectStorageUnavailableError:
                errors[image_file_id] = DownloadError(
                    code="storage_error",
                    message="对象存储服务不可用",
                )
                continue
            items[image_file_id] = self._download_url(image, url)
        return BatchDownloadUrls(items=items, errors=errors)

    def _visible_ready_image(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
    ) -> ImageFileRecord:
        image = self._visibility.get_visible_image(image_file_id, actor)
        if image is None:
            raise ImageFileNotFoundError
        if image.status not in READY_FILE_STATUSES:
            raise ImageNotReadyError("影像文件尚未完成上传")
        return image

    def _download_url(self, image: ImageFileRecord, url: str) -> DownloadUrl:
        return DownloadUrl(
            url=url,
            expires_in=self._expires_in,
            expires_at=(
                datetime.now(timezone.utc) + timedelta(seconds=self._expires_in)
            ).isoformat(),
            filename=str(image.original_filename),
            mime_type=image.mime_type,
            etag=image.storage_etag,
        )
