"""缩略图调度和生成流程使用的 DTO。"""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.imaging.domain import ImageFileTypeEnum


@dataclass(frozen=True, slots=True)
class ThumbnailTaskEvent:
    event_type: str
    version: int
    derivative_id: int
    image_file_id: int
    source_storage_etag: str | None


@dataclass(frozen=True, slots=True)
class ThumbnailGenerationSource:
    derivative_id: int
    image_file_id: int
    file_uuid: str
    file_type: ImageFileTypeEnum
    source_bucket: str
    source_object_key: str
    expected_source_etag: str | None
    previous_thumbnail_bucket: str | None
    previous_thumbnail_object_key: str | None


@dataclass(frozen=True, slots=True)
class ThumbnailGenerationResult:
    source_storage_etag: str
    storage_bucket: str
    object_key: str
    storage_etag: str | None
    mime_type: str
    width: int
    height: int
    file_size: int
