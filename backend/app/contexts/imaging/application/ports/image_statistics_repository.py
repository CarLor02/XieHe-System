"""影像统计查询端口。"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.contexts.imaging.application.dto import (
    DashboardImageCounts,
    ImageStatistics,
    RecentImage,
)
from app.contexts.imaging.domain import ImageAccessScope


class ImageStatisticsRepository(Protocol):
    def get_image_stats(self, scope: ImageAccessScope) -> ImageStatistics: ...

    def get_dashboard_counts(
        self,
        *,
        scope: ImageAccessScope,
        today_start: datetime,
        week_start: datetime,
    ) -> DashboardImageCounts: ...

    def list_recent_images(
        self,
        *,
        scope: ImageAccessScope,
        limit: int,
    ) -> list[RecentImage]: ...
