"""影像列表、详情、审计和统计查询的应用边界。"""

from __future__ import annotations

from datetime import datetime

from app.contexts.imaging.application.dto import (
    AnnotationBatchItem,
    AnnotationHistoryItem,
    AnnotationHistoryVersion,
    DashboardImageCounts,
    ImageDetail,
    ImageListFilters,
    ImageStatistics,
    ImageSummary,
    PageResult,
    RecentImage,
)
from app.contexts.imaging.domain import ImageAccessActor

from .ports import (
    AnnotationHistoryRepository,
    ImageAccessScopeResolver,
    ImageQueryRepository,
    ImageStatisticsRepository,
)


class ImagingQueryService:
    def __init__(
        self,
        repository: ImageQueryRepository,
        history_repository: AnnotationHistoryRepository,
        statistics_repository: ImageStatisticsRepository,
        visibility: ImageAccessScopeResolver,
    ) -> None:
        self._repository = repository
        self._history_repository = history_repository
        self._statistics_repository = statistics_repository
        self._visibility = visibility

    def list_images(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        filters: ImageListFilters,
    ) -> PageResult[ImageSummary]:
        return self._repository.list_images(
            scope=self._visibility.resolve_scope(actor),
            page=page,
            page_size=page_size,
            filters=filters,
        )

    def get_detail(
        self,
        *,
        actor: ImageAccessActor,
        image_file_id: int,
    ) -> ImageDetail | None:
        return self._repository.get_detail(
            image_file_id=image_file_id,
            scope=self._visibility.resolve_scope(actor),
        )

    def list_navigation_ids(self, actor: ImageAccessActor) -> list[int]:
        return self._repository.list_navigation_ids(
            self._visibility.resolve_scope(actor)
        )

    def get_annotation_batch(
        self,
        *,
        actor: ImageAccessActor,
        image_file_ids: list[int],
    ) -> list[AnnotationBatchItem]:
        return self._repository.get_annotation_batch(
            image_file_ids=image_file_ids,
            scope=self._visibility.resolve_scope(actor),
        )

    def list_history(
        self,
        *,
        actor: ImageAccessActor,
        image_file_id: int,
        page: int,
        page_size: int,
        item_kind: str | None,
        item_id: str | None,
    ) -> PageResult[AnnotationHistoryItem] | None:
        return self._history_repository.list_history(
            image_file_id=image_file_id,
            scope=self._visibility.resolve_scope(actor),
            page=page,
            page_size=page_size,
            item_kind=item_kind,
            item_id=item_id,
        )

    def get_history_version(
        self,
        *,
        actor: ImageAccessActor,
        image_file_id: int,
        version: int,
    ) -> AnnotationHistoryVersion | None:
        return self._history_repository.get_history_version(
            image_file_id=image_file_id,
            version=version,
            scope=self._visibility.resolve_scope(actor),
        )

    def get_image_stats(self, actor: ImageAccessActor) -> ImageStatistics:
        return self._statistics_repository.get_image_stats(
            self._visibility.resolve_scope(actor)
        )

    def get_dashboard_counts(
        self,
        *,
        actor: ImageAccessActor,
        today_start: datetime,
        week_start: datetime,
    ) -> DashboardImageCounts:
        return self._statistics_repository.get_dashboard_counts(
            scope=self._visibility.resolve_scope(actor),
            today_start=today_start,
            week_start=week_start,
        )

    def list_recent_images(
        self,
        *,
        actor: ImageAccessActor,
        limit: int,
    ) -> list[RecentImage]:
        return self._statistics_repository.list_recent_images(
            scope=self._visibility.resolve_scope(actor),
            limit=limit,
        )
