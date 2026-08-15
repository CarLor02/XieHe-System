"""ThumbnailWorker 的任务状态持久化端口。"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.contexts.imaging.application.dto import (
    ThumbnailGenerationResult,
    ThumbnailGenerationSource,
    ThumbnailTaskEvent,
)


class ThumbnailTaskRepository(Protocol):
    def claim(
        self,
        event: ThumbnailTaskEvent,
        *,
        now: datetime,
        lease_seconds: int,
    ) -> ThumbnailGenerationSource | None: ...

    def mark_ready(
        self,
        event: ThumbnailTaskEvent,
        result: ThumbnailGenerationResult,
    ) -> bool: ...

    def mark_failed(
        self,
        event: ThumbnailTaskEvent,
        *,
        error: str,
        transient: bool,
        max_retries: int,
        now: datetime,
    ) -> None: ...

    def list_requeue_candidates(
        self,
        *,
        now: datetime,
        pending_before: datetime,
        limit: int,
    ) -> list[ThumbnailTaskEvent]: ...
