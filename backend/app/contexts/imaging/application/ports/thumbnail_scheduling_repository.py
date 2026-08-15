"""缩略图任务调度持久化端口。"""

from __future__ import annotations

from typing import Protocol

from .records import ImageFileDerivativeRecord, ImageFileRecord


class ThumbnailSchedulingRepository(Protocol):
    def list_backfill_images(
        self,
        *,
        after_id: int,
        limit: int,
    ) -> list[ImageFileRecord]: ...

    def has_ready_for_current_source(self, image: ImageFileRecord) -> bool: ...

    def upsert_pending(
        self, image: ImageFileRecord
    ) -> ImageFileDerivativeRecord | None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
