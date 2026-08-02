"""影像应用层所需的基础设施端口。"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from app.contexts.imaging.domain import (
    AnnotationItemChange,
    ImageAccessActor,
    ImageAccessScope,
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
        scope: ImageAccessScope,
        page: int,
        page_size: int,
        filters: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], int]: ...

    def get_detail(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
    ) -> dict[str, Any] | None: ...

    def list_navigation_ids(
        self,
        scope: ImageAccessScope,
    ) -> list[int]: ...

    def get_annotation_batch(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
    ) -> list[dict[str, Any]]: ...

    def list_history(
        self,
        *,
        image_file_id: int,
        scope: ImageAccessScope,
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
        scope: ImageAccessScope,
    ) -> dict[str, Any] | None: ...

    def get_image_stats(self, scope: ImageAccessScope) -> dict[str, Any]: ...

    def get_dashboard_counts(
        self,
        *,
        scope: ImageAccessScope,
        today_start: datetime,
        week_start: datetime,
    ) -> dict[str, int]: ...

    def list_recent_images(
        self,
        *,
        scope: ImageAccessScope,
        limit: int,
    ) -> list[dict[str, Any]]: ...


class ImageVisibilityRepository(Protocol):
    """影像访问规则所需的数据库事实与持久化端口。"""

    def list_active_admin_team_ids(self, user_id: int) -> set[int]: ...

    def find_assignable_active_team_ids(
        self,
        actor: ImageAccessActor,
        requested_team_ids: list[int],
    ) -> set[int]: ...

    def get_visible_image(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
        *,
        for_update: bool = False,
    ) -> ImageFile | None: ...

    def get_visible_images_by_ids(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
    ) -> dict[int, ImageFile]: ...

    def list_visible_uploader_ids(
        self,
        scope: ImageAccessScope,
    ) -> list[int] | None: ...

    def replace_team_visibility(
        self,
        image: ImageFile,
        team_ids: list[int],
    ) -> None: ...


class ImageAccessScopeResolver(Protocol):
    def resolve_scope(self, actor: ImageAccessActor) -> ImageAccessScope: ...
