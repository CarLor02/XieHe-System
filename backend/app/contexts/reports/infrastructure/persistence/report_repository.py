"""SQLAlchemy report-management repository."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any, Mapping, cast

from sqlalchemy import and_, or_, text
from sqlalchemy.orm import Session

from app.contexts.patients.infrastructure.persistence.models import Patient
from app.contexts.reports.application.dto import (
    CreateReportCommand,
    ReportDetails,
    ReportListItem,
    ReportListQuery,
    ReportPage,
)
from app.contexts.reports.domain import (
    normalize_report_priority,
    report_priority_to_api,
)

from .models import (
    DiagnosticReport,
    PriorityEnum,
    ReportStatusEnum,
    ReportTypeEnum,
)


def _enum_value(value: object) -> str:
    if isinstance(value, enum.Enum):
        return str(value.value)
    return str(value)


def _details(report: DiagnosticReport, patient_name: str) -> ReportDetails:
    return ReportDetails(
        id=report.id,
        report_number=str(report.report_number),
        patient_id=report.patient_id,
        patient_name=patient_name,
        study_id=report.study_id,
        template_id=report.template_id,
        report_title=str(report.report_title),
        clinical_history=report.clinical_history,
        examination_technique=report.examination_technique,
        findings=report.findings,
        impression=report.impression,
        recommendations=report.recommendations,
        primary_diagnosis=cast(str | None, report.primary_diagnosis),
        secondary_diagnosis=report.secondary_diagnosis,
        priority=report_priority_to_api(_enum_value(report.priority)),
        status=_enum_value(report.status),
        ai_assisted=bool(report.ai_assisted),
        ai_confidence=float(report.ai_confidence)
        if report.ai_confidence is not None
        else None,
        created_at=cast(datetime, report.created_at),
        updated_at=cast(datetime, report.updated_at),
        created_by=report.created_by,
        reviewed_by=cast(str | None, report.reviewing_physician),
        reviewed_at=report.reviewed_date,
    )


class SqlAlchemyReportRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(
        self,
        *,
        command: CreateReportCommand,
        report_number: str,
        patient_name: str,
        actor_id: int | None,
        actor_name: str,
        now: datetime,
    ) -> ReportDetails:
        report = DiagnosticReport(
            report_number=report_number,
            patient_id=command.patient_id,
            study_id=command.study_id or 0,
            template_id=command.template_id,
            report_type=ReportTypeEnum.RADIOLOGY,
            report_title=command.report_title,
            clinical_history=command.clinical_history,
            examination_technique=command.examination_technique,
            findings=command.findings or "",
            impression=command.impression or "",
            recommendations=command.recommendations,
            primary_diagnosis=command.primary_diagnosis,
            secondary_diagnosis=command.secondary_diagnosis,
            priority=PriorityEnum(normalize_report_priority(command.priority)),
            status=ReportStatusEnum.DRAFT,
            report_date=now.date(),
            reporting_physician=actor_name,
            ai_assisted=False,
            created_by=actor_id,
            created_at=now,
            updated_at=now,
        )
        self._session.add(report)
        self._session.flush()
        return _details(report, patient_name)

    def list(self, query: ReportListQuery) -> ReportPage:
        base_query = """
        SELECT
            dr.id,
            dr.report_number,
            dr.patient_id,
            p.name as patient_name,
            dr.study_id,
            dr.report_title,
            dr.status,
            dr.priority,
            dr.primary_diagnosis,
            dr.reporting_physician,
            dr.report_date,
            dr.created_at,
            dr.updated_at
        FROM diagnostic_reports dr
        LEFT JOIN patients p ON dr.patient_id = p.id
        WHERE (dr.is_deleted = 0 OR dr.is_deleted IS NULL)
        """
        conditions: list[str] = []
        params: dict[str, Any] = {}

        if query.patient_id:
            conditions.append("dr.patient_id = :patient_id")
            params["patient_id"] = query.patient_id
        if query.status:
            conditions.append("dr.status = :status")
            params["status"] = query.status.upper()
        if query.priority:
            conditions.append("dr.priority = :priority")
            params["priority"] = normalize_report_priority(query.priority)
        if query.search:
            conditions.append(
                "(p.name LIKE :search OR dr.report_title LIKE :search "
                "OR dr.primary_diagnosis LIKE :search)"
            )
            params["search"] = f"%{query.search}%"
        if conditions:
            base_query += " AND " + " AND ".join(conditions)

        count_query = f"SELECT COUNT(*) FROM ({base_query}) as count_table"
        total = int(self._session.execute(text(count_query), params).scalar() or 0)

        base_query += " ORDER BY dr.created_at DESC LIMIT :limit OFFSET :offset"
        params["limit"] = query.page_size
        params["offset"] = query.offset
        rows = self._session.execute(text(base_query), params).fetchall()

        items = tuple(
            ReportListItem(
                id=int(row[0]),
                report_number=str(row[1] or f"RPT-{row[0]}"),
                patient_id=int(row[2]),
                patient_name=str(row[3] or "未知患者"),
                study_id=int(row[4]) if row[4] is not None else None,
                report_title=str(row[5] or "诊断报告"),
                status=str(row[6] or "draft"),
                priority=str(row[7] or "normal"),
                primary_diagnosis=str(row[8] or ""),
                reporting_physician=str(row[9] or "未指定医生"),
                report_date=row[10].strftime("%Y-%m-%d") if row[10] else "",
                created_at=row[11].isoformat() if row[11] else "",
                updated_at=row[12].isoformat() if row[12] else "",
            )
            for row in rows
        )
        return ReportPage(
            items=items,
            total=total,
            page=query.page,
            page_size=query.page_size,
        )

    def get_details(
        self, report_id: int, *, require_active_patient: bool
    ) -> ReportDetails | None:
        filters = [DiagnosticReport.id == report_id]
        if require_active_patient:
            filters.append(Patient.is_deleted.is_(False))
        else:
            filters.append(
                or_(Patient.is_deleted.is_(False), Patient.is_deleted.is_(None))
            )
        result = (
            self._session.query(DiagnosticReport, Patient.name.label("patient_name"))
            .join(Patient, DiagnosticReport.patient_id == Patient.id)
            .filter(and_(*filters))
            .first()
        )
        if result is None:
            return None
        report, patient_name = result
        return _details(report, str(patient_name))

    def update(
        self,
        report_id: int,
        *,
        changes: Mapping[str, str | None],
        actor_id: int | None,
        now: datetime,
    ) -> ReportDetails | None:
        result = (
            self._session.query(DiagnosticReport, Patient.name.label("patient_name"))
            .join(Patient, DiagnosticReport.patient_id == Patient.id)
            .filter(
                DiagnosticReport.id == report_id,
                Patient.is_deleted.is_(False),
            )
            .first()
        )
        if result is None:
            return None
        report, patient_name = result
        for field, value in changes.items():
            if field == "priority":
                report.priority = PriorityEnum(normalize_report_priority(value))
            else:
                setattr(report, field, value)
        report.updated_by = actor_id
        report.updated_at = now
        self._session.flush()
        return _details(report, str(patient_name))

    def get_status(self, report_id: int) -> str | None:
        report = (
            self._session.query(DiagnosticReport)
            .filter(DiagnosticReport.id == report_id)
            .first()
        )
        return _enum_value(report.status) if report is not None else None

    def soft_delete(
        self, report_id: int, *, actor_id: int | None, now: datetime
    ) -> str | None:
        report = (
            self._session.query(DiagnosticReport)
            .filter(DiagnosticReport.id == report_id)
            .first()
        )
        if report is None:
            return None
        report.is_deleted = True
        report.updated_by = actor_id
        report.updated_at = now
        self._session.flush()
        return str(report.report_number)


class SqlAlchemyReportPatientReader:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_active_name(self, patient_id: int) -> str | None:
        patient = (
            self._session.query(Patient)
            .filter(Patient.id == patient_id, Patient.is_deleted.is_(False))
            .first()
        )
        return str(patient.name) if patient is not None else None


class SqlAlchemyReportTransaction:
    def __init__(self, session: Session) -> None:
        self._session = session

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()
