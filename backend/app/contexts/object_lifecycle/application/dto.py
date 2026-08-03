"""Object lifecycle application result types."""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.object_lifecycle.domain import ObjectCleanupCandidate


@dataclass(frozen=True)
class ObjectCleanupFailure:
    candidate: ObjectCleanupCandidate
    message: str


@dataclass(frozen=True)
class ObjectCleanupResult:
    deleted_count: int
    failures: tuple[ObjectCleanupFailure, ...]
