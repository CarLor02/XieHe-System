"""Persistence port for report management."""

from __future__ import annotations

from datetime import datetime
from typing import Mapping, Protocol

from app.contexts.reports.application.dto import (
    CreateReportCommand,
    ReportDetails,
    ReportListQuery,
    ReportPage,
)


class ReportRepository(Protocol):
    def create(
        self,
        *,
        command: CreateReportCommand,
        report_number: str,
        patient_name: str,
        actor_id: int | None,
        actor_name: str,
        now: datetime,
    ) -> ReportDetails: ...

    def list(self, query: ReportListQuery) -> ReportPage: ...

    def get_details(
        self, report_id: int, *, require_active_patient: bool
    ) -> ReportDetails | None: ...

    def update(
        self,
        report_id: int,
        *,
        changes: Mapping[str, str | None],
        actor_id: int | None,
        now: datetime,
    ) -> ReportDetails | None: ...

    def get_status(self, report_id: int) -> str | None: ...

    def soft_delete(
        self, report_id: int, *, actor_id: int | None, now: datetime
    ) -> str | None: ...
