"""影像访问范围持久化端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.domain import ImageAccessActor, ImageAccessScope
from app.models.image_file import ImageFile


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
