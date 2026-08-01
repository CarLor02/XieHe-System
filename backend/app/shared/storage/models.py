"""Data models returned by the internal object-storage service."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional


@dataclass(frozen=True)
class StorageObjectStat:
    """Metadata returned for an object stored by the storage service."""

    bucket: str
    object_key: str
    size: int
    etag: Optional[str]
    content_type: Optional[str]
    metadata: Dict[str, str]
