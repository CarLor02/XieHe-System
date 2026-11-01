"""Dashboard 概览统计查询用例。"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Callable

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.dashboard.domain import (
    DashboardOverview,
)
from app.contexts.dashboard.domain.models import completion_rate

from .ports import (
    ImagingDashboardReader,
    PatientDashboardReader,
)


class DashboardQueryService:
    def __init__(
        self,
        patient_reader: PatientDashboardReader,
        imaging_reader: ImagingDashboardReader,
        *,
        now: Callable[[], datetime] = datetime.now,
    ) -> None:
        self._patient_reader = patient_reader
        self._imaging_reader = imaging_reader
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
            generated_at=generated_at,
        )
