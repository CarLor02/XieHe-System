"""Schemas for object-storage upload sessions."""

from typing import List, Optional
from pydantic import BaseModel, Field


class CreateUploadSessionRequest(BaseModel):
    """Create a MinIO multipart upload session for an image file."""

    filename: str = Field(..., min_length=1, max_length=255, description="原始文件名")
    size: int = Field(..., gt=0, description="文件大小")
    mime_type: str = Field(..., min_length=1, max_length=100, description="MIME类型")
    patient_id: Optional[int] = Field(None, description="患者ID")
    description: Optional[str] = Field(None, description="检查类型/描述")
    team_ids: List[int] = Field(default_factory=list, description="影像归属团队ID")
    file_hash: Optional[str] = Field(None, max_length=64, description="文件MD5，可选")


class PresignedUploadPart(BaseModel):
    """A presigned URL for one multipart upload part."""

    part_number: int
    url: str


class CreateUploadSessionResponse(BaseModel):
    """Upload session returned to the frontend."""

    image_file_id: int
    file_uuid: str
    storage_bucket: str
    object_key: str
    upload_id: str
    part_size: int
    expires_in: int
    parts: List[PresignedUploadPart]


class CompleteUploadPart(BaseModel):
    """Completed multipart part information reported by the browser."""

    part_number: int
    etag: str


class CompleteUploadSessionRequest(BaseModel):
    """Complete a MinIO multipart upload session."""

    upload_id: str
    parts: List[CompleteUploadPart] = Field(..., min_length=1)
    file_hash: Optional[str] = Field(None, max_length=64)


class UploadSessionStatus(BaseModel):
    """Upload status response."""

    image_file_id: int
    file_uuid: str
    status: str
    upload_progress: int


class BatchCreateUploadFileRequest(BaseModel):
    """One file in a batch upload session request."""

    client_file_id: str = Field(..., min_length=1, max_length=128)
    filename: str = Field(..., min_length=1, max_length=255)
    size: int = Field(..., gt=0)
    mime_type: str = Field(..., min_length=1, max_length=100)
    file_hash: Optional[str] = Field(None, max_length=64)


class BatchCreateUploadSessionsRequest(BaseModel):
    """Create MinIO multipart upload sessions for a batch of image files."""

    patient_id: int = Field(..., gt=0)
    description: Optional[str] = None
    team_ids: List[int] = Field(default_factory=list)
    files: List[BatchCreateUploadFileRequest] = Field(..., min_length=1, max_length=200)


class BatchUploadSessionItem(BaseModel):
    """Upload session returned for one file in a batch."""

    client_file_id: str
    image_file_id: int
    file_uuid: str
    storage_bucket: str
    object_key: str
    upload_id: str
    part_size: int
    expires_in: int
    parts: List[PresignedUploadPart]


class BatchCreateUploadSessionsResponse(BaseModel):
    """Batch upload sessions response."""

    items: List[BatchUploadSessionItem]


class BatchCompleteUploadItem(BaseModel):
    """One completed multipart upload in a batch."""

    client_file_id: str
    image_file_id: int
    upload_id: str
    parts: List[CompleteUploadPart] = Field(..., min_length=1)
    file_hash: Optional[str] = Field(None, max_length=64)


class BatchCompleteUploadRequest(BaseModel):
    """Complete a batch of MinIO multipart uploads."""

    items: List[BatchCompleteUploadItem] = Field(..., min_length=1, max_length=200)


class BatchCompleteUploadResult(BaseModel):
    """Per-file complete result."""

    client_file_id: str
    image_file_id: int
    status: str
    upload_progress: int
    ai_status: str
    error: Optional[str] = None


class BatchCompleteUploadResponse(BaseModel):
    """Batch complete response."""

    items: List[BatchCompleteUploadResult]


class BatchUploadStatusItem(BaseModel):
    """Per-file polling status after batch import."""

    image_file_id: int
    status: str
    upload_progress: int
    has_annotation: bool
    ai_status: str
    error: Optional[str] = None


class BatchUploadStatusResponse(BaseModel):
    """Batch polling response."""

    items: List[BatchUploadStatusItem]
