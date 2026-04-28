"""Schemas for the generation API endpoints."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class MeasurementItem(BaseModel):
    type: str
    value: str
    description: Optional[str] = None


class GenerateReportRequest(BaseModel):
    imageId: str
    examType: str
    measurements: List[MeasurementItem]


class GenerateReportResponse(BaseModel):
    report: str
    generatedAt: str
