"""报告管理应用用例。"""

from __future__ import annotations

import uuid
from collections.abc import Callable
from datetime import datetime

from app.contexts.reports.domain import (
    ReportNotFound,
    ReportPatientNotFound,
    ensure_report_deletable,
    ensure_report_editable,
    generate_report_number,
)

from .dto import (
    CreateReportCommand,
    ReportDetails,
    ReportListQuery,
    ReportPage,
    UpdateReportCommand,
)
from .ports import ReportPatientReader, ReportRepository, ReportTransaction


def _new_report_token() -> str:
    return uuid.uuid4().hex


class ReportManagementApplicationService:
    """编排报告仓储、患者读取和事务，不暴露 ORM。"""

    def __init__(
        self,
        repository: ReportRepository,
        patient_reader: ReportPatientReader,
        transaction: ReportTransaction,
        *,
        now: Callable[[], datetime] = datetime.now,
        token_factory: Callable[[], str] = _new_report_token,
    ) -> None:
        self._repository = repository
        self._patient_reader = patient_reader
        self._transaction = transaction
        self._now = now
        self._token_factory = token_factory

    def create(
        self,
        command: CreateReportCommand,
        *,
        actor_id: int | None,
        actor_name: str,
    ) -> ReportDetails:
        patient_name = self._patient_reader.get_active_name(command.patient_id)
        if patient_name is None:
            raise ReportPatientNotFound(command.patient_id)

        now = self._now()
        try:
            report = self._repository.create(
                command=command,
                report_number=generate_report_number(now, self._token_factory()),
                patient_name=patient_name,
                actor_id=actor_id,
                actor_name=actor_name,
                now=now,
            )
            self._transaction.commit()
            return report
        except Exception:
            self._transaction.rollback()
            raise

    def list(self, query: ReportListQuery) -> ReportPage:
        return self._repository.list(query)

    def get(self, report_id: int) -> ReportDetails:
        report = self._repository.get_details(report_id, require_active_patient=False)
        if report is None:
            raise ReportNotFound(report_id)
        return report

    def update(
        self,
        report_id: int,
        command: UpdateReportCommand,
        *,
        actor_id: int | None,
    ) -> ReportDetails:
        current = self._repository.get_details(report_id, require_active_patient=True)
        if current is None:
            raise ReportNotFound(report_id)
        ensure_report_editable(current.status)

        try:
            updated = self._repository.update(
                report_id,
                changes=command.changes,
                actor_id=actor_id,
                now=self._now(),
            )
            if updated is None:
                raise ReportNotFound(report_id)
            self._transaction.commit()
            return updated
        except Exception:
            self._transaction.rollback()
            raise

    def delete(self, report_id: int, *, actor_id: int | None) -> str:
        current_status = self._repository.get_status(report_id)
        if current_status is None:
            raise ReportNotFound(report_id)
        ensure_report_deletable(current_status)

        try:
            report_number = self._repository.soft_delete(
                report_id,
                actor_id=actor_id,
                now=self._now(),
            )
            if report_number is None:
                raise ReportNotFound(report_id)
            self._transaction.commit()
            return report_number
        except Exception:
            self._transaction.rollback()
            raise
