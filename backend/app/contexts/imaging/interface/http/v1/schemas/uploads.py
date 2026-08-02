"""影像上传与批量导入 HTTP v1 schema。"""

from pydantic import BaseModel, Field


class CreateUploadSessionRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0)
    mime_type: str = Field(min_length=1, max_length=100)
    patient_id: int | None = None
    description: str | None = None
    team_ids: list[int] = Field(default_factory=list)
    file_hash: str | None = Field(None, max_length=64)


class CompleteUploadPart(BaseModel):
    part_number: int
    etag: str


class CompleteUploadSessionRequest(BaseModel):
    upload_id: str
    parts: list[CompleteUploadPart] = Field(min_length=1)
    file_hash: str | None = Field(None, max_length=64)


class BatchCreateUploadFileRequest(BaseModel):
    client_file_id: str = Field(min_length=1, max_length=128)
    filename: str = Field(min_length=1, max_length=255)
    size: int = Field(gt=0)
    mime_type: str = Field(min_length=1, max_length=100)
    file_hash: str | None = Field(None, max_length=64)


class CreateImageImportBatchRequest(BaseModel):
    patient_id: int = Field(gt=0)
    description: str | None = None
    team_ids: list[int] = Field(default_factory=list)
    files: list[BatchCreateUploadFileRequest] = Field(min_length=1)


class CreateImageImportSessionsRequest(BaseModel):
    item_ids: list[int] = Field(min_length=1, max_length=10)


class CompleteImageImportItemRequest(BaseModel):
    upload_id: str = Field(min_length=1)
    parts: list[CompleteUploadPart] = Field(min_length=1)
    file_hash: str | None = Field(None, max_length=64)


class MarkImageImportUploadFailedRequest(BaseModel):
    error: str = Field(min_length=1, max_length=2000)
