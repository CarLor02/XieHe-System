"""单文件上传和批量导入应用 DTO。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from .storage import MultipartPart, PresignedPart


@dataclass(frozen=True, slots=True)
class UploadFileSpec:
    filename: str
    size: int
    mime_type: str
    patient_id: int | None
    description: str | None
    team_ids: list[int]
    file_hash: str | None


@dataclass(frozen=True, slots=True)
class UploadSession:
    image_file_id: int
    file_uuid: str
    storage_bucket: str
    object_key: str
    upload_id: str
    part_size: int
    expires_in: int
    parts: list[PresignedPart]


@dataclass(frozen=True, slots=True)
class UploadStatus:
    image_file_id: int
    file_uuid: str
    status: str
    upload_progress: int


@dataclass(frozen=True, slots=True)
class UploadRecord:
    id: int
    file_id: int
    file_uuid: str
    filename: str
    file_size: int
    file_type: str
    mime_type: str | None
    status: str
    patient_id: int | None
    uploaded_at: datetime | None
    description: str | None


@dataclass(frozen=True, slots=True)
class ImportFileSpec:
    client_file_id: str
    filename: str
    size: int
    mime_type: str
    file_hash: str | None


@dataclass(frozen=True, slots=True)
class CreateImportBatch:
    patient_id: int
    description: str | None
    team_ids: list[int]
    files: list[ImportFileSpec]


@dataclass(frozen=True, slots=True)
class ImportBatch:
    batch_id: str
    patient_id: int
    description: str | None
    team_ids: list[int]
    status: str
    total_items: int
    uploaded_items: int
    succeeded_items: int
    failed_items: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None


@dataclass(frozen=True, slots=True)
class ImportItem:
    id: int
    client_file_id: str
    filename: str
    size: int
    mime_type: str
    image_file_id: int | None
    upload_status: str
    ai_status: str
    error: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class ImportBatchCreated:
    batch: ImportBatch
    items: list[ImportItem]


@dataclass(frozen=True, slots=True)
class ImportUploadSession:
    item_id: int
    client_file_id: str
    image_file_id: int
    file_uuid: str
    storage_bucket: str
    object_key: str
    upload_id: str
    part_size: int
    expires_in: int
    parts: list[PresignedPart]


@dataclass(frozen=True, slots=True)
class ImportItemResult:
    item: ImportItem
    message: str


@dataclass(frozen=True, slots=True)
class CompleteUpload:
    upload_id: str
    parts: list[MultipartPart]
    file_hash: str | None


@dataclass(frozen=True, slots=True)
class AiTaskEvent:
    event_type: str
    version: int
    task_id: str
    batch_id: str
    batch_item_id: int
    image_file_id: int
    requested_by: int
