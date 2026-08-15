"""影像对象访问与下载地址用例。"""

from datetime import datetime, timedelta, timezone
from pathlib import PurePath
from typing import Literal

from app.contexts.imaging.application.dto import (
    BatchDownloadUrls,
    DownloadError,
    DownloadUrl,
)
from app.contexts.imaging.application.errors import (
    ImageNotReadyError,
    ObjectStorageUnavailableError,
)
from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageDerivativeStatus,
    ImageFileNotFoundError,
    supports_card_thumbnail,
)

from .image_status import READY_FILE_STATUSES
from .ports import (
    ImageFileDerivativeRecord,
    ImageFileRecord,
    ImageFileRepository,
    ObjectStorage,
    ThumbnailQueryRepository,
)
from .visibility_service import ImageVisibilityApplicationService


class ImageDeliveryService:
    def __init__(
        self,
        repository: ImageFileRepository,
        visibility: ImageVisibilityApplicationService,
        thumbnails: ThumbnailQueryRepository,
        storage: ObjectStorage,
        *,
        expires_in: int,
    ) -> None:
        self._repository = repository
        self._visibility = visibility
        self._thumbnails = thumbnails
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
        *,
        variant: Literal["original", "thumbnail"] = "original",
    ) -> BatchDownloadUrls:
        ordered_ids = list(dict.fromkeys(image_file_ids))
        scope = self._visibility.resolve_scope(actor)
        images = self._repository.list_visible_by_ids(ordered_ids, scope)
        if variant == "thumbnail":
            return await self._get_thumbnail_urls(ordered_ids, images)

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

    async def _get_thumbnail_urls(
        self,
        ordered_ids: list[int],
        images: dict[int, ImageFileRecord],
    ) -> BatchDownloadUrls:
        derivatives = self._thumbnails.list_card_thumbnails(list(images))
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
            if not supports_card_thumbnail(image.file_type):
                errors[image_file_id] = DownloadError(
                    code="thumbnail_unsupported",
                    message="该影像格式不支持缩略图",
                )
                continue
            derivative = derivatives.get(image_file_id)
            if derivative is None or derivative.status in {
                ImageDerivativeStatus.PENDING.value,
                ImageDerivativeStatus.PROCESSING.value,
            }:
                errors[image_file_id] = DownloadError(
                    code="thumbnail_not_ready",
                    message="缩略图尚未生成完成",
                )
                continue
            if derivative.status == ImageDerivativeStatus.FAILED.value:
                errors[image_file_id] = DownloadError(
                    code="thumbnail_failed",
                    message="缩略图生成失败",
                )
                continue
            if not derivative.storage_bucket or not derivative.object_key:
                errors[image_file_id] = DownloadError(
                    code="thumbnail_failed",
                    message="缩略图对象信息不完整",
                )
                continue
            try:
                url = await self._storage.presign_get(
                    bucket=derivative.storage_bucket,
                    object_key=derivative.object_key,
                    expires_in=self._expires_in,
                )
            except ObjectStorageUnavailableError:
                errors[image_file_id] = DownloadError(
                    code="storage_error",
                    message="对象存储服务不可用",
                )
                continue
            items[image_file_id] = self._thumbnail_download_url(
                image,
                derivative,
                url,
            )
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
            file_size=image.file_size,
        )

    def _thumbnail_download_url(
        self,
        image: ImageFileRecord,
        derivative: ImageFileDerivativeRecord,
        url: str,
    ) -> DownloadUrl:
        stem = PurePath(str(image.original_filename)).stem or "image"
        return DownloadUrl(
            url=url,
            expires_in=self._expires_in,
            expires_at=(
                datetime.now(timezone.utc) + timedelta(seconds=self._expires_in)
            ).isoformat(),
            filename=f"{stem}.thumbnail.webp",
            mime_type=derivative.mime_type or "image/webp",
            etag=derivative.storage_etag,
            width=derivative.width,
            height=derivative.height,
            file_size=derivative.file_size,
        )
