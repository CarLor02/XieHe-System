"""上传链路的文档模型；不改变既有路由和返回序列化。"""

from datetime import datetime

from pydantic import BaseModel

from .storage_results import ImportItemResult, ImportUploadSessionResult


class ImageImportConfigResult(BaseModel):
    max_files: int
    session_window_size: int


class ImageImportCreatedResult(BaseModel):
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
    items: list[ImportItemResult]


class ImageImportSessionsResult(BaseModel):
    items: list[ImportUploadSessionResult]
