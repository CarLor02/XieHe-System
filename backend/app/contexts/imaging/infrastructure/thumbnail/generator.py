"""Pillow-based thumbnail generator using the internal storage service."""

from __future__ import annotations

import asyncio
import io
import tempfile
from typing import BinaryIO

from PIL import Image, ImageOps, UnidentifiedImageError

from app.contexts.imaging.application.dto import (
    ThumbnailGenerationResult,
    ThumbnailGenerationSource,
)
from app.contexts.imaging.application.errors import ThumbnailGenerationError
from app.contexts.imaging.domain import (
    build_card_thumbnail_object_key,
    normalize_storage_etag,
    supports_card_thumbnail,
)
from app.shared.storage import (
    StorageServiceClient,
    StorageServiceError,
    storage_service_client,
)

from .display_mapping import map_to_thumbnail_display_image

_THUMBNAIL_SIZE = (640, 960)
_WEBP_QUALITY = 80


class PillowThumbnailGenerationGateway:
    def __init__(self, client: StorageServiceClient = storage_service_client) -> None:
        self._client = client

    async def generate(
        self, source: ThumbnailGenerationSource
    ) -> ThumbnailGenerationResult:
        if not supports_card_thumbnail(source.file_type):
            raise ThumbnailGenerationError(
                "不支持该影像格式生成缩略图", transient=False
            )
        try:
            stat = await self._client.stat_object(
                bucket=source.source_bucket,
                object_key=source.source_object_key,
            )
        except StorageServiceError as exc:
            raise ThumbnailGenerationError(str(exc), transient=True) from exc
        source_etag = normalize_storage_etag(stat.etag)
        expected_etag = normalize_storage_etag(source.expected_source_etag)
        if source_etag is None:
            raise ThumbnailGenerationError(
                "原图对象缺少 ETag，无法生成受版本保护的缩略图",
                transient=False,
            )
        if expected_etag is not None and expected_etag != source_etag:
            raise ThumbnailGenerationError("原图版本已变化", transient=False)

        with tempfile.TemporaryFile(mode="w+b") as original:
            try:
                await self._client.download_object_to(
                    bucket=source.source_bucket,
                    object_key=source.source_object_key,
                    destination=original,
                )
            except StorageServiceError as exc:
                raise ThumbnailGenerationError(str(exc), transient=True) from exc
            original.seek(0)
            try:
                payload, width, height = await asyncio.to_thread(
                    _render_webp_thumbnail,
                    original,
                )
            except (
                Image.DecompressionBombError,
                UnidentifiedImageError,
                OSError,
                ValueError,
            ) as exc:
                raise ThumbnailGenerationError(
                    f"影像格式损坏或无法解码: {exc}",
                    transient=False,
                ) from exc

        object_key = build_card_thumbnail_object_key(source.file_uuid, source_etag)
        try:
            write_result = await self._client.put_object(
                bucket=source.source_bucket,
                object_key=object_key,
                data=payload,
                content_type="image/webp",
            )
        except StorageServiceError as exc:
            raise ThumbnailGenerationError(str(exc), transient=True) from exc
        etag = write_result.get("etag")
        return ThumbnailGenerationResult(
            source_storage_etag=source_etag,
            storage_bucket=source.source_bucket,
            object_key=object_key,
            storage_etag=str(etag) if etag is not None else None,
            mime_type="image/webp",
            width=width,
            height=height,
            file_size=len(payload),
        )

    async def delete(self, *, bucket: str, object_key: str) -> None:
        try:
            await self._client.delete_object(bucket=bucket, object_key=object_key)
        except StorageServiceError as exc:
            raise ThumbnailGenerationError(str(exc), transient=True) from exc


def _render_webp_thumbnail(source: BinaryIO) -> tuple[bytes, int, int]:
    with Image.open(source) as opened:
        # TIFF may contain many frames; the card always represents its first image.
        if (opened.format or "").upper() == "TIFF":
            opened.seek(0)
        source_format = (opened.format or "").upper()
        source_mode = opened.mode
        image = ImageOps.exif_transpose(opened)
        image.load()
        image = map_to_thumbnail_display_image(
            image,
            source_format=source_format,
            source_mode=source_mode,
        )
        image.thumbnail(_THUMBNAIL_SIZE, Image.Resampling.LANCZOS)
        output = io.BytesIO()
        image.save(output, format="WEBP", quality=_WEBP_QUALITY, method=6)
        return output.getvalue(), image.width, image.height
