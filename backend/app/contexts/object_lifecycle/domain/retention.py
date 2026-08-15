"""Retention rules for soft-deleted stored objects."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import StrEnum


class ObjectOwnerKind(StrEnum):
    """Business owner whose stored object is awaiting physical deletion."""

    IMAGE_FILE = "image_file"
    IMAGE_FILE_DERIVATIVE = "image_file_derivative"
    USER_AVATAR = "user_avatar"


@dataclass(frozen=True)
class ObjectCleanupCandidate:
    """Storage identity detached from ORM entities and external clients."""

    owner_kind: ObjectOwnerKind
    owner_id: int
    bucket: str
    object_key: str


@dataclass(frozen=True)
class ObjectRetentionPolicy:
    """Soft-deleted objects become purgeable after the configured retention period."""

    retention_days: int = 30

    def cutoff(self, now: datetime) -> datetime:
        return now - timedelta(days=self.retention_days)
