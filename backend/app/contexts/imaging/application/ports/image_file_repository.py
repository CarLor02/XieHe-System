"""影像文件写操作和选择器持久化端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import (
    AssignableTeam,
    ImageDetail,
    ImageUploader,
    PageResult,
)
from app.contexts.imaging.domain import ImageAccessActor, ImageAccessScope

from .records import ImageFileRecord


class ImageFileRepository(Protocol):
    def get_active(
        self, image_file_id: int, *, for_update: bool = False
    ) -> ImageFileRecord | None: ...

    def get_detail(self, image: ImageFileRecord) -> ImageDetail: ...

    def list_uploaders(
        self,
        *,
        visible_uploader_ids: list[int] | None,
        page: int,
        page_size: int,
        search: str | None,
    ) -> PageResult[ImageUploader]: ...

    def list_assignable_teams(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        search: str | None,
    ) -> PageResult[AssignableTeam]: ...

    def list_visible_by_ids(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
    ) -> dict[int, ImageFileRecord]: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def refresh(self, image: ImageFileRecord) -> None: ...
