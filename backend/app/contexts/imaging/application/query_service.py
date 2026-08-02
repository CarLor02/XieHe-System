"""影像列表、详情和审计查询的应用边界。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from app.contexts.imaging.domain import ImageAccessActor

from .ports import ImageAccessScopeResolver, ImageQueryRepository


class ImagingQueryService:
    def __init__(
        self,
        repository: ImageQueryRepository,
        visibility: ImageAccessScopeResolver,
    ) -> None:
        self._repository = repository
        self._visibility = visibility

    def list_images(
        self,
        *,
        actor: ImageAccessActor,
        **kwargs: Any,
    ) -> tuple[list[dict[str, Any]], int]:
        return self._repository.list_images(
            scope=self._visibility.resolve_scope(actor),
            **kwargs,
        )

    def get_detail(
        self,
        *,
        actor: ImageAccessActor,
        **kwargs: Any,
    ) -> dict[str, Any] | None:
        return self._repository.get_detail(
            scope=self._visibility.resolve_scope(actor),
            **kwargs,
        )

    def list_navigation_ids(self, actor: ImageAccessActor) -> list[int]:
        return self._repository.list_navigation_ids(
            self._visibility.resolve_scope(actor)
        )

    def get_annotation_batch(
        self,
        *,
        actor: ImageAccessActor,
        **kwargs: Any,
    ) -> list[dict[str, Any]]:
        return self._repository.get_annotation_batch(
            scope=self._visibility.resolve_scope(actor),
            **kwargs,
        )

    def list_history(
        self,
        *,
        actor: ImageAccessActor,
        **kwargs: Any,
    ) -> tuple[list[dict[str, Any]], int] | None:
        return self._repository.list_history(
            scope=self._visibility.resolve_scope(actor),
            **kwargs,
        )

    def get_history_version(
        self,
        *,
        actor: ImageAccessActor,
        **kwargs: Any,
    ) -> dict[str, Any] | None:
        return self._repository.get_history_version(
            scope=self._visibility.resolve_scope(actor),
            **kwargs,
        )

    def get_image_stats(self, actor: ImageAccessActor) -> dict[str, Any]:
        return self._repository.get_image_stats(self._visibility.resolve_scope(actor))

    def get_dashboard_counts(
        self,
        *,
        actor: ImageAccessActor,
        today_start: datetime,
        week_start: datetime,
    ) -> dict[str, int]:
        return self._repository.get_dashboard_counts(
            scope=self._visibility.resolve_scope(actor),
            today_start=today_start,
            week_start=week_start,
        )

    def list_recent_images(
        self,
        *,
        actor: ImageAccessActor,
        limit: int,
    ) -> list[dict[str, Any]]:
        return self._repository.list_recent_images(
            scope=self._visibility.resolve_scope(actor),
            limit=limit,
        )
