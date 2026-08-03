"""Persistence port for expired stored objects."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.contexts.object_lifecycle.domain import ObjectCleanupCandidate


class ObjectCleanupRepository(Protocol):
    def list_expired(self, cutoff: datetime) -> list[ObjectCleanupCandidate]: ...

    def mark_purged(self, candidate: ObjectCleanupCandidate) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
