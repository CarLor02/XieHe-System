"""Dashboard 数据源端口。"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Protocol

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.dashboard.domain import ImageCounts, PatientCounts, RecentActivity


class PatientDashboardReader(Protocol):
    def counts(
        self, *, today_start: datetime, week_start: datetime
    ) -> PatientCounts: ...

    def recent(self, limit: int) -> list[RecentActivity]: ...


class ImagingDashboardReader(Protocol):
    def counts(
        self,
        *,
        principal: AccessPrincipal,
        today_start: datetime,
        week_start: datetime,
    ) -> ImageCounts: ...

    def recent(
        self, *, principal: AccessPrincipal, limit: int
    ) -> list[RecentActivity]: ...


class ReportDashboardReader(Protocol):
    def recent(self, limit: int) -> list[RecentActivity]: ...


class DashboardSupplementProvider(Protocol):
    def average_processing_time(self) -> float: ...

    def metrics(self) -> list[dict[str, Any]]: ...

    def tasks(self) -> list[dict[str, Any]]: ...
