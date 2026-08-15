"""影像派生对象的状态和值规则。"""

from __future__ import annotations

import hashlib
from enum import StrEnum

from .image_file import ImageFileTypeEnum


class ImageDerivativeVariant(StrEnum):
    CARD_THUMBNAIL = "CARD_THUMBNAIL"


class ImageDerivativeStatus(StrEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    READY = "READY"
    FAILED = "FAILED"


CARD_THUMBNAIL_RENDER_VERSION = "v2"


THUMBNAIL_SUPPORTED_FILE_TYPES = frozenset(
    {
        ImageFileTypeEnum.JPEG,
        ImageFileTypeEnum.PNG,
        ImageFileTypeEnum.TIFF,
    }
)


def supports_card_thumbnail(file_type: ImageFileTypeEnum) -> bool:
    return file_type in THUMBNAIL_SUPPORTED_FILE_TYPES


def normalize_storage_etag(etag: str | None) -> str | None:
    if etag is None:
        return None
    normalized = etag.strip().strip('"')
    return normalized or None


def build_card_thumbnail_object_key(file_uuid: str, source_etag: str) -> str:
    """Source and renderer versions jointly identify immutable thumbnail bytes."""

    normalized = normalize_storage_etag(source_etag)
    if normalized is None:
        raise ValueError("source ETag is required")
    etag_hash = hashlib.sha256(normalized.encode("utf-8")).hexdigest()[:24]
    return (
        f"{file_uuid}/derivatives/card-thumbnail/"
        f"{CARD_THUMBNAIL_RENDER_VERSION}/{etag_hash}.webp"
    )


def is_current_card_thumbnail_object_key(
    *,
    file_uuid: str,
    source_etag: str | None,
    object_key: str | None,
) -> bool:
    """Return whether an object was built by the current rendering contract."""

    normalized = normalize_storage_etag(source_etag)
    if normalized is None or not object_key:
        return False
    return object_key == build_card_thumbnail_object_key(file_uuid, normalized)
