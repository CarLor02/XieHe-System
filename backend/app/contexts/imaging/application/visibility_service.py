"""影像访问范围和团队归属的应用层编排。"""

from __future__ import annotations

from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageAccessScope,
    build_image_access_scope,
    can_choose_image_uploader,
    normalize_team_ids,
    require_all_teams_assignable,
)
from app.models.image_file import ImageFile

from .ports import ImageVisibilityRepository


class ImageVisibilityApplicationService:
    """把认证身份、团队事实和影像仓储操作组合为统一访问边界。"""

    def __init__(self, repository: ImageVisibilityRepository) -> None:
        self._repository = repository

    def resolve_scope(self, actor: ImageAccessActor) -> ImageAccessScope:
        managed_team_ids = (
            set()
            if actor.unrestricted or actor.user_id is None
            else self._repository.list_active_admin_team_ids(actor.user_id)
        )
        return build_image_access_scope(actor, managed_team_ids)

    def can_choose_uploader(self, actor: ImageAccessActor) -> bool:
        return can_choose_image_uploader(self.resolve_scope(actor))

    def get_visible_image(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
        *,
        for_update: bool = False,
    ) -> ImageFile | None:
        return self._repository.get_visible_image(
            image_file_id,
            self.resolve_scope(actor),
            for_update=for_update,
        )

    def get_visible_images_by_ids(
        self,
        image_file_ids: list[int],
        actor: ImageAccessActor,
        *,
        for_update: bool = False,
    ) -> dict[int, ImageFile]:
        if not image_file_ids:
            return {}
        return self._repository.get_visible_images_by_ids(
            image_file_ids,
            self.resolve_scope(actor),
            for_update=for_update,
        )

    def list_visible_uploader_ids(
        self,
        actor: ImageAccessActor,
    ) -> list[int] | None:
        return self._repository.list_visible_uploader_ids(self.resolve_scope(actor))

    def validate_assignable_team_ids(
        self,
        actor: ImageAccessActor,
        team_ids: list[int] | None,
    ) -> list[int]:
        normalized_ids = normalize_team_ids(team_ids)
        if not normalized_ids:
            return []
        assignable_ids = self._repository.find_assignable_active_team_ids(
            actor,
            normalized_ids,
        )
        require_all_teams_assignable(normalized_ids, assignable_ids)
        return normalized_ids

    def replace_team_visibility(
        self,
        image: ImageFile,
        team_ids: list[int],
    ) -> None:
        self._repository.replace_team_visibility(image, team_ids)
