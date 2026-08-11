"""Persistence-neutral record contracts used by imaging application ports."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.contexts.imaging.domain import (
    AITaskStatusEnum,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
    JsonObject,
)


class ImageFileRecord(Protocol):
    id: int
    file_uuid: str
    original_filename: str
    file_type: ImageFileTypeEnum
    mime_type: str | None
    storage_bucket: str
    object_key: str
    storage_etag: str | None
    file_size: int
    file_hash: str | None
    thumbnail_path: str | None
    uploaded_by: int
    patient_id: int | None
    study_date: datetime | None
    description: str | None
    annotation: JsonObject | None
    annotation_version: int
    has_annotation: bool
    annotation_created_at: datetime | None
    annotation_created_by: int | None
    annotation_updated_at: datetime | None
    annotation_updated_by: int | None
    status: ImageFileStatusEnum
    upload_progress: int | None
    created_at: datetime
    updated_at: datetime | None
    uploaded_at: datetime | None
    is_deleted: bool | None
    deleted_at: datetime | None
    deleted_by: int | None


class ImageImportBatchRecord(Protocol):
    id: int
    batch_id: str
    uploaded_by: int
    patient_id: int
    description: str | None
    team_ids: list[int] | None
    status: str
    total_items: int
    uploaded_items: int
    succeeded_items: int
    failed_items: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


class ImageImportItemRecord(Protocol):
    id: int
    batch_id: int
    client_file_id: str
    filename: str
    size: int
    mime_type: str
    file_hash: str | None
    image_file_id: int | None
    upload_id: str | None
    upload_status: str
    ai_status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime
    image_file: ImageFileRecord | None


class AiTaskRecord(Protocol):
    id: int
    task_id: str
    status: AITaskStatusEnum
    created_by: int | None
