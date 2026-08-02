"""Values and errors used by report-text generation."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ReportMeasurement:
    """One measurement supplied to the report generator."""

    type: str
    value: str
    description: str | None = None


@dataclass(frozen=True, slots=True)
class GeneratedReport:
    """Generated report text and its display timestamp."""

    report: str
    generated_at: str


class UnsupportedExamType(ValueError):
    """Raised when no report template exists for an exam type."""

    def __init__(self, exam_type: str) -> None:
        super().__init__(f"不支持的影像类型: {exam_type}")
        self.exam_type = exam_type
