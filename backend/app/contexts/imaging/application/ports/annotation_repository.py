"""标注写入持久化端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.domain import (
    AnnotationItemChange,
    ImageAccessScope,
    JsonObject,
)
from app.models.image_file import ImageFile


class AnnotationRepository(Protocol):
    def get_for_update(self, image_file_id: int) -> ImageFile | None: ...

    def get_visible_for_update(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
    ) -> ImageFile | None: ...

    def append_revision(
        self,
        *,
        image_file_id: int,
        version: int,
        snapshot: JsonObject,
        source: str,
        reason: str,
        actor_id: int | None,
        changes: list[AnnotationItemChange],
    ) -> None: ...

    def flush(self) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...
