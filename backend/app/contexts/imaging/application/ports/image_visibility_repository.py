"""影像访问范围持久化端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.domain import ImageAccessActor, ImageAccessScope

from .records import ImageFileRecord


class ImageVisibilityRepository(Protocol):
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
    ) -> ImageFileRecord | None: ...

    def get_visible_images_by_ids(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
        *,
        for_update: bool = False,
    ) -> dict[int, ImageFileRecord]: ...

    def list_visible_uploader_ids(
        self,
        scope: ImageAccessScope,
    ) -> list[int] | None: ...

    def replace_team_visibility(
        self,
        image: ImageFileRecord,
        team_ids: list[int],
    ) -> None: ...
