"""HTTP 返回模型；与应用 DTO 分离，固定对外字段及 JSON 类型。"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class PresignedPartResult(BaseModel):
    part_number: int
    url: str


class DownloadUrlResult(BaseModel):
    url: str
    expires_in: int
    expires_at: str
    filename: str
    mime_type: str | None
    etag: str | None
    width: int | None = None
    height: int | None = None
    file_size: int | None = None


class DownloadErrorResult(BaseModel):
    code: str
    message: str


class BatchDownloadUrlsResult(BaseModel):
    items: dict[int, DownloadUrlResult]
    errors: dict[int, DownloadErrorResult]


class UploadSessionResult(BaseModel):
    session_id: str
    file_uuid: str
    storage_bucket: str
    object_key: str
    part_size: int
    expires_in: int
    parts: list[PresignedPartResult]


class UploadStatusResult(BaseModel):
    session_id: str
    file_uuid: str
    status: str
    upload_progress: int
    image_file_id: int | None
    expires_at: datetime | None
    error: str | None


class UploadRecordResult(BaseModel):
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


class ImportBatchResult(BaseModel):
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


class ImportItemResult(BaseModel):
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


class ImportUploadSessionResult(BaseModel):
    item_id: int
    client_file_id: str
    session_id: str
    file_uuid: str
    storage_bucket: str
    object_key: str
    part_size: int
    expires_in: int
    parts: list[PresignedPartResult]
