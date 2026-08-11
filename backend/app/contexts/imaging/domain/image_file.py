"""Image-file lifecycle values owned by the imaging domain."""

from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import datetime


class ImageFileTypeEnum(str, enum.Enum):
    DICOM = "DICOM"
    JPEG = "JPEG"
    PNG = "PNG"
    TIFF = "TIFF"
    OTHER = "OTHER"


class ImageFileStatusEnum(str, enum.Enum):
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"


@dataclass(frozen=True, slots=True)
class ImageFileDraft:
    """Persistence-independent values required to register an image file."""

    file_uuid: str
    original_filename: str
    file_type: ImageFileTypeEnum
    mime_type: str
    storage_bucket: str
    object_key: str
    file_size: int
    file_hash: str | None
    uploaded_by: int
    patient_id: int | None
    study_date: datetime
    description: str | None
    status: ImageFileStatusEnum = ImageFileStatusEnum.UPLOADING
    upload_progress: int = 0
