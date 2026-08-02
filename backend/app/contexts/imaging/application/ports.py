"""影像应用层所需的基础设施端口。"""

from __future__ import annotations

from typing import Any, Protocol

from app.contexts.imaging.domain import AnnotationItemChange
from app.models.image_file import ImageFile


class AnnotationRepository(Protocol):
    def get_for_update(self, image_file_id: int) -> ImageFile | None: ...

    def get_visible_for_update(
        self,
        image_file_id: int,
        current_user: dict[str, Any],
    ) -> ImageFile | None: ...

    def append_revision(
        self,
        *,
        image_file_id: int,
        version: int,
        snapshot: dict[str, Any],
        source: str,
        reason: str,
        actor_id: int | None,
        changes: list[AnnotationItemChange],
    ) -> None: ...

    def flush(self) -> None: ...


class ImageQueryRepository(Protocol):
    def list_images(
        self,
        *,
        current_user: dict[str, Any],
        page: int,
        page_size: int,
        filters: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], int]: ...

    def get_detail(
        self,
        image_file_id: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any] | None: ...

    def list_navigation_ids(
        self,
        current_user: dict[str, Any],
    ) -> list[int]: ...

    def get_annotation_batch(
        self,
        image_file_ids: list[int],
        current_user: dict[str, Any],
    ) -> list[dict[str, Any]]: ...

    def list_history(
        self,
        *,
        image_file_id: int,
        current_user: dict[str, Any],
        page: int,
        page_size: int,
        item_kind: str | None,
        item_id: str | None,
    ) -> tuple[list[dict[str, Any]], int] | None: ...

    def get_history_version(
        self,
        *,
        image_file_id: int,
        version: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any] | None: ...
