"""Dashboard 数据源端口。"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.dashboard.domain import ImageCounts, PatientCounts


class PatientDashboardReader(Protocol):
    def counts(
        self, *, today_start: datetime, week_start: datetime
    ) -> PatientCounts: ...


class ImagingDashboardReader(Protocol):
    def counts(
        self,
        *,
        principal: AccessPrincipal,
        today_start: datetime,
        week_start: datetime,
    ) -> ImageCounts: ...
