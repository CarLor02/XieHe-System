"""Application use case for deterministic report-text generation."""

from __future__ import annotations

from collections.abc import Callable, Sequence
from datetime import datetime

from app.contexts.reports.domain import (
    GeneratedReport,
    ReportMeasurement,
    generate_report_text,
)


class ReportGenerationApplicationService:
    """Generate one report while keeping wall-clock access outside the domain."""

    def __init__(self, now: Callable[[], datetime] = datetime.now) -> None:
        self._now = now

    def generate(
        self,
        *,
        exam_type: str,
        measurements: Sequence[ReportMeasurement],
    ) -> GeneratedReport:
        generated_at = self._now().strftime("%Y-%m-%d %H:%M:%S")
        return GeneratedReport(
            report=generate_report_text(
                exam_type=exam_type,
                measurements=measurements,
                generated_time=generated_at,
            ),
            generated_at=generated_at,
        )
