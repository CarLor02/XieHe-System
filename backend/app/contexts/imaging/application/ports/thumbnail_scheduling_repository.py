"""缩略图任务调度持久化端口。"""

from __future__ import annotations

from typing import Protocol

from .records import ImageFileDerivativeRecord, ImageFileRecord


class ThumbnailSchedulingRepository(Protocol):
    def upsert_pending(
        self, image: ImageFileRecord
    ) -> ImageFileDerivativeRecord | None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
