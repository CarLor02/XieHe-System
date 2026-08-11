"""SQLAlchemy 影像访问范围翻译与团队归属持久化。"""

from __future__ import annotations

from typing import Any, cast

from sqlalchemy import false, or_
from sqlalchemy.orm import Query, Session

from app.contexts.imaging.application.ports import ImageFileRecord
from app.contexts.imaging.domain import ImageAccessActor, ImageAccessScope
from app.contexts.teams.application import TeamAccessService
from app.contexts.teams.infrastructure import SqlAlchemyTeamAccessRepository

from .image_file_models import ImageFile, ImageFileTeamVisibility


def apply_image_access_scope(
    query: Query[Any],
    scope: ImageAccessScope,
) -> Query[Any]:
    """把纯领域访问范围翻译为 SQLAlchemy 过滤条件。"""

    if scope.unrestricted:
        return query
    if scope.actor_id is None:
        return query.filter(false())

    if scope.managed_team_ids:
        team_visibility = (
            query.session.query(ImageFileTeamVisibility.image_file_id)
            .filter(
                ImageFileTeamVisibility.image_file_id == ImageFile.id,
                ImageFileTeamVisibility.team_id.in_(scope.managed_team_ids),
            )
            .exists()
        )
        return query.filter(
            or_(ImageFile.uploaded_by == scope.actor_id, team_visibility)
        )
    return query.filter(ImageFile.uploaded_by == scope.actor_id)


class SqlAlchemyImageVisibilityRepository:
    """使用一个请求级 Session 提供权限事实和可见影像查询。"""

    def __init__(self, session: Session) -> None:
        self._session = session
        self._team_access = TeamAccessService(SqlAlchemyTeamAccessRepository(session))

    def list_active_admin_team_ids(self, user_id: int) -> set[int]:
        return self._team_access.list_active_admin_team_ids(user_id)

    def find_assignable_active_team_ids(
        self,
        actor: ImageAccessActor,
        requested_team_ids: list[int],
    ) -> set[int]:
        return self._team_access.find_assignable_active_team_ids(
            actor_id=actor.user_id,
            unrestricted=actor.unrestricted,
            requested_team_ids=requested_team_ids,
        )

    def get_visible_image(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
        *,
        for_update: bool = False,
    ) -> ImageFileRecord | None:
        query = self._session.query(ImageFile).filter(
            ImageFile.id == image_file_id,
            ImageFile.is_deleted.is_(False),
        )
        query = apply_image_access_scope(query, scope)
        if for_update:
            query = query.populate_existing().with_for_update()
        return cast(ImageFileRecord | None, query.first())

    def get_visible_images_by_ids(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
        *,
        for_update: bool = False,
    ) -> dict[int, ImageFileRecord]:
        query = self._session.query(ImageFile).filter(
            ImageFile.id.in_(image_file_ids),
            ImageFile.is_deleted.is_(False),
        )
        query = apply_image_access_scope(query, scope).order_by(ImageFile.id.asc())
        if for_update:
            query = query.populate_existing().with_for_update()
        return cast(
            dict[int, ImageFileRecord],
            {image.id: image for image in query.all()},
        )

    def list_visible_uploader_ids(
        self,
        scope: ImageAccessScope,
    ) -> list[int] | None:
        if scope.unrestricted:
            return None
        query = self._session.query(ImageFile.uploaded_by).filter(
            ImageFile.is_deleted.is_(False)
        )
        rows = apply_image_access_scope(query, scope).distinct().all()
        return sorted(uploader_id for (uploader_id,) in rows)

    def replace_team_visibility(
        self,
        image: ImageFileRecord,
        team_ids: list[int],
    ) -> None:
        image_model = cast(ImageFile, image)
        image_model.team_visibilities = [
            ImageFileTeamVisibility(image_file_id=image_model.id, team_id=team_id)
            for team_id in team_ids
        ]
