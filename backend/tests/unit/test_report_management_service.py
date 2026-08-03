from __future__ import annotations

from dataclasses import replace
from datetime import datetime
from typing import Mapping

import pytest

from app.contexts.reports.application import ReportManagementApplicationService
from app.contexts.reports.application.dto import (
    CreateReportCommand,
    ReportDetails,
    ReportListQuery,
    ReportPage,
    UpdateReportCommand,
)
from app.contexts.reports.domain import (
    ReportNotDeletable,
    ReportNotEditable,
    ReportPatientNotFound,
)


def _report(*, status: str = "DRAFT") -> ReportDetails:
    now = datetime(2026, 8, 3, 10, 0)
    return ReportDetails(
        id=7,
        report_number="RPT20260803TOKEN123",
        patient_id=3,
        patient_name="测试患者",
        study_id=0,
        template_id=None,
        report_title="测试报告",
        clinical_history=None,
        examination_technique=None,
        findings="",
        impression="",
        recommendations=None,
        primary_diagnosis=None,
        secondary_diagnosis=None,
        priority="normal",
        status=status,
        ai_assisted=False,
        ai_confidence=None,
        created_at=now,
        updated_at=now,
        created_by=1,
        reviewed_by=None,
        reviewed_at=None,
    )


def _create_command() -> CreateReportCommand:
    return CreateReportCommand(
        patient_id=3,
        study_id=None,
        template_id=None,
        report_title="测试报告",
        clinical_history=None,
        examination_technique=None,
        findings=None,
        impression=None,
        recommendations=None,
        primary_diagnosis=None,
        secondary_diagnosis=None,
        priority="normal",
    )


class _ReportRepository:
    def __init__(self, report: ReportDetails, *, fail_create: bool = False) -> None:
        self.report = report
        self.fail_create = fail_create

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
        if self.fail_create:
            raise RuntimeError("write failed")
        return replace(
            self.report,
            report_number=report_number,
            patient_name=patient_name,
            created_by=actor_id,
            created_at=now,
            updated_at=now,
        )

    def list(self, query: ReportListQuery) -> ReportPage:
        return ReportPage((), 0, query.page, query.page_size)

    def get_details(
        self, report_id: int, *, require_active_patient: bool
    ) -> ReportDetails | None:
        return self.report if report_id == self.report.id else None

    def update(
        self,
        report_id: int,
        *,
        changes: Mapping[str, str | None],
        actor_id: int | None,
        now: datetime,
    ) -> ReportDetails | None:
        if report_id != self.report.id:
            return None
        return replace(self.report, updated_at=now)

    def get_status(self, report_id: int) -> str | None:
        return self.report.status if report_id == self.report.id else None

    def soft_delete(
        self,
        report_id: int,
        *,
        actor_id: int | None,
        now: datetime,
    ) -> str | None:
        return self.report.report_number if report_id == self.report.id else None


class _PatientReader:
    def __init__(self, name: str | None) -> None:
        self.name = name

    def get_active_name(self, patient_id: int) -> str | None:
        return self.name


class _Transaction:
    def __init__(self) -> None:
        self.commits = 0
        self.rollbacks = 0

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        self.rollbacks += 1


def _service(
    report: ReportDetails,
    *,
    patient_name: str | None = "测试患者",
    fail_create: bool = False,
) -> tuple[ReportManagementApplicationService, _Transaction]:
    transaction = _Transaction()
    service = ReportManagementApplicationService(
        _ReportRepository(report, fail_create=fail_create),
        _PatientReader(patient_name),
        transaction,
        now=lambda: datetime(2026, 8, 3, 10, 0),
        token_factory=lambda: "token123456",
    )
    return service, transaction


def test_create_report_requires_an_active_patient() -> None:
    service, transaction = _service(_report(), patient_name=None)

    with pytest.raises(ReportPatientNotFound):
        service.create(_create_command(), actor_id=1, actor_name="医生")

    assert transaction.commits == 0
    assert transaction.rollbacks == 0


def test_create_report_rolls_back_when_repository_write_fails() -> None:
    service, transaction = _service(_report(), fail_create=True)

    with pytest.raises(RuntimeError, match="write failed"):
        service.create(_create_command(), actor_id=1, actor_name="医生")

    assert transaction.commits == 0
    assert transaction.rollbacks == 1


def test_finalized_report_cannot_be_updated_or_deleted() -> None:
    service, transaction = _service(_report(status="FINALIZED"))

    with pytest.raises(ReportNotEditable):
        service.update(
            7,
            UpdateReportCommand(changes={"report_title": "新标题"}),
            actor_id=1,
        )
    with pytest.raises(ReportNotDeletable):
        service.delete(7, actor_id=1)

    assert transaction.commits == 0
    assert transaction.rollbacks == 0
