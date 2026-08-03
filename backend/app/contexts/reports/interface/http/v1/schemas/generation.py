"""HTTP schemas for report-text generation."""

from __future__ import annotations

from pydantic import BaseModel


class MeasurementItem(BaseModel):
    type: str
    value: str
    description: str | None = None


class GenerateReportRequest(BaseModel):
    imageId: str
    examType: str
    measurements: list[MeasurementItem]
