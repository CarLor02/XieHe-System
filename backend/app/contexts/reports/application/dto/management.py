"""报告管理应用层命令与查询结果。"""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date, datetime
from typing import Any, Mapping


@dataclass(frozen=True, slots=True)
class CreateReportCommand:
    patient_id: int
    study_id: int | None
    template_id: int | None
    report_title: str
    clinical_history: str | None
    examination_technique: str | None
    findings: str | None
    impression: str | None
    recommendations: str | None
    primary_diagnosis: str | None
    secondary_diagnosis: str | None
    priority: str | None


@dataclass(frozen=True, slots=True)
class UpdateReportCommand:
    changes: Mapping[str, str | None]


@dataclass(frozen=True, slots=True)
class ReportListQuery:
    page: int
    page_size: int
    patient_id: int | None = None
    status: str | None = None
    priority: str | None = None
    search: str | None = None

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


@dataclass(frozen=True, slots=True)
class ReportDetails:
    id: int
    report_number: str
    patient_id: int
    patient_name: str
    study_id: int | None
    template_id: int | None
    report_title: str
    clinical_history: str | None
    examination_technique: str | None
    findings: str | None
    impression: str | None
    recommendations: str | None
    primary_diagnosis: str | None
    secondary_diagnosis: str | None
    priority: str
    status: str
    ai_assisted: bool
    ai_confidence: float | None
    created_at: datetime
    updated_at: datetime
    created_by: int | None
    reviewed_by: str | None
    reviewed_at: date | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class ReportListItem:
    id: int
    report_number: str
    patient_id: int
    patient_name: str
    study_id: int | None
    report_title: str
    status: str
    priority: str
    primary_diagnosis: str
    reporting_physician: str
    report_date: str
    created_at: str
    updated_at: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class ReportPage:
    items: tuple[ReportListItem, ...]
    total: int
    page: int
    page_size: int
