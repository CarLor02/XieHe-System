"""Persistent upload-session lifecycle rules."""

from __future__ import annotations

import enum


class ImageUploadSourceType(str, enum.Enum):
    SINGLE = "SINGLE"
    BATCH_IMPORT = "BATCH_IMPORT"


class ImageUploadSessionStatus(str, enum.Enum):
    INITIALIZING = "INITIALIZING"
    READY = "READY"
    COMPLETING = "COMPLETING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


ACTIVE_UPLOAD_SESSION_STATUSES = {
    ImageUploadSessionStatus.INITIALIZING,
    ImageUploadSessionStatus.READY,
    ImageUploadSessionStatus.COMPLETING,
}
