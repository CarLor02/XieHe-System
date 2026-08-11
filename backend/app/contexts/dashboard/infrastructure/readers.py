"""Dashboard 患者、影像和报告读取适配器。"""

from __future__ import annotations

from datetime import datetime
from typing import cast

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.dashboard.domain import ImageCounts, PatientCounts, RecentActivity
from app.contexts.imaging.application import ImagingQueryService
from app.contexts.imaging.domain import ImageAccessActor
from app.contexts.patients.infrastructure.persistence.models import (
    Patient,
    PatientStatusEnum,
)
from app.contexts.reports.infrastructure.persistence import DiagnosticReport


class SqlAlchemyPatientDashboardReader:
    def __init__(self, session: Session) -> None:
        self._session = session

    def counts(self, *, today_start: datetime, week_start: datetime) -> PatientCounts:
        base = self._session.query(func.count(Patient.id)).filter(
            Patient.is_deleted.is_(False)
        )
        return PatientCounts(
            total=int(base.scalar() or 0),
            today=int(base.filter(Patient.created_at >= today_start).scalar() or 0),
            week=int(base.filter(Patient.created_at >= week_start).scalar() or 0),
            active=int(
                base.filter(Patient.status == PatientStatusEnum.ACTIVE).scalar() or 0
            ),
        )

    def recent(self, limit: int) -> list[RecentActivity]:
        if limit <= 0:
            return []
        patients = (
            self._session.query(Patient)
            .filter(Patient.is_deleted.is_(False))
            .order_by(desc(Patient.created_at))
            .limit(limit)
            .all()
        )
        return [
            RecentActivity(
                id=patient.id,
                type="patient",
                title=f"新患者: {patient.name}",
                description=f"患者ID: {patient.patient_id}",
                timestamp=cast(datetime, patient.created_at),
                status="new",
            )
            for patient in patients
        ]


class ImagingApplicationDashboardReader:
    def __init__(self, service: ImagingQueryService) -> None:
        self._service = service

    def counts(
        self,
        *,
        principal: AccessPrincipal,
        today_start: datetime,
        week_start: datetime,
    ) -> ImageCounts:
        counts = self._service.get_dashboard_counts(
            actor=self._actor(principal),
            today_start=today_start,
            week_start=week_start,
        )
        return ImageCounts(
            total=counts.total,
            today=counts.today,
            week=counts.week,
            pending=counts.pending,
            processed=counts.processed,
        )

    def recent(self, *, principal: AccessPrincipal, limit: int) -> list[RecentActivity]:
        if limit <= 0:
            return []
        images = self._service.list_recent_images(
            actor=self._actor(principal), limit=limit
        )
        return [
            RecentActivity(
                id=image.id,
                type="image",
                title=f"新影像: {image.original_filename or '影像文件'}",
                description=f"文件ID: {image.id}",
                timestamp=image.created_at,
                status=image.status,
            )
            for image in images
        ]

    @staticmethod
    def _actor(principal: AccessPrincipal) -> ImageAccessActor:
        raw_id = principal.get("id") or principal.get("user_id")
        try:
            user_id = int(raw_id) if raw_id is not None else None
        except (TypeError, ValueError):
            user_id = None
        return ImageAccessActor(
            user_id=user_id,
            unrestricted=bool(
                principal.get("is_superuser", False)
                or principal.get("is_system_admin", False)
            ),
        )


class SqlAlchemyReportDashboardReader:
    def __init__(self, session: Session) -> None:
        self._session = session

    def recent(self, limit: int) -> list[RecentActivity]:
        if limit <= 0:
            return []
        reports = (
            self._session.query(DiagnosticReport)
            .filter(DiagnosticReport.is_deleted.is_(False))
            .order_by(desc(DiagnosticReport.created_at))
            .limit(limit)
            .all()
        )
        return [
            RecentActivity(
                id=report.id,
                type="report",
                title=f"新报告: {report.report_title}",
                description=f"报告编号: {report.report_number}",
                timestamp=cast(datetime, report.created_at),
                status=(
                    report.status.value
                    if hasattr(report.status, "value")
                    else str(report.status)
                ),
            )
            for report in reports
        ]
