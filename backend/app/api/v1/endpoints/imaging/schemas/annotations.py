"""Schemas for the annotations API endpoints."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Point(BaseModel):
    x: float
    y: float


class MeasurementData(BaseModel):
    id: str
    type: str
    value: str
    points: List[Point]
    description: Optional[str] = None


class SaveMeasurementsRequest(BaseModel):
    imageId: str
    patientId: int
    examType: str
    measurements: List[MeasurementData]
    reportText: Optional[str] = None
    savedAt: str


class MeasurementsResponse(BaseModel):
    measurements: List[MeasurementData]
    reportText: Optional[str] = None
    savedAt: Optional[str] = None
