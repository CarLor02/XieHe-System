"""Dashboard 概览、活动与临时补充数据查询用例。"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Callable

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.dashboard.domain import (
    DashboardOverview,
    RecentActivity,
)
from app.contexts.dashboard.domain.models import completion_rate

from .ports import (
    DashboardSupplementProvider,
    ImagingDashboardReader,
    PatientDashboardReader,
    ReportDashboardReader,
)


class DashboardQueryService:
    def __init__(
        self,
        patient_reader: PatientDashboardReader,
        imaging_reader: ImagingDashboardReader,
        report_reader: ReportDashboardReader,
        supplements: DashboardSupplementProvider,
        *,
        now: Callable[[], datetime] = datetime.now,
    ) -> None:
        self._patient_reader = patient_reader
        self._imaging_reader = imaging_reader
        self._report_reader = report_reader
        self._supplements = supplements
        self._now = now

    def overview(self, principal: AccessPrincipal) -> DashboardOverview:
        generated_at = self._now()
        today = generated_at.date()
        today_start = datetime.combine(today, datetime.min.time())
        week_start = today - timedelta(days=today.weekday())
        week_start_at = datetime.combine(week_start, datetime.min.time())
        patients = self._patient_reader.counts(
            today_start=today_start, week_start=week_start_at
        )
        images = self._imaging_reader.counts(
            principal=principal,
            today_start=today_start,
            week_start=week_start_at,
        )
        return DashboardOverview(
            total_patients=patients.total,
            new_patients_today=patients.today,
            new_patients_week=patients.week,
            active_patients=patients.active,
            total_images=images.total,
            images_today=images.today,
            images_week=images.week,
            pending_images=images.pending,
            processed_images=images.processed,
            completion_rate=completion_rate(images),
            average_processing_time=self._supplements.average_processing_time(),
            system_alerts=images.pending,
            generated_at=generated_at,
        )

    def recent_activities(
        self, principal: AccessPrincipal, *, limit: int
    ) -> list[RecentActivity]:
        source_limit = limit // 3
        activities = [
            *self._patient_reader.recent(source_limit),
            *self._imaging_reader.recent(principal=principal, limit=source_limit),
            *self._report_reader.recent(source_limit),
        ]
        activities.sort(key=lambda item: item.timestamp, reverse=True)
        return activities[:limit]

    def system_metrics(self) -> list[dict[str, Any]]:
        return self._supplements.metrics()

    def tasks(self) -> list[dict[str, Any]]:
        return self._supplements.tasks()
