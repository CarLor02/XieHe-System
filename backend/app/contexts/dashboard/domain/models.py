"""Dashboard 稳定读模型与计算规则。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class PatientCounts:
    total: int
    today: int
    week: int
    active: int


@dataclass(frozen=True, slots=True)
class ImageCounts:
    total: int
    today: int
    week: int
    pending: int
    processed: int


@dataclass(frozen=True, slots=True)
class DashboardOverview:
    total_patients: int
    new_patients_today: int
    new_patients_week: int
    active_patients: int
    total_images: int
    images_today: int
    images_week: int
    pending_images: int
    processed_images: int
    completion_rate: float
    average_processing_time: float
    system_alerts: int
    generated_at: datetime


@dataclass(frozen=True, slots=True)
class RecentActivity:
    id: int
    type: str
    title: str
    description: str
    timestamp: datetime
    status: str


def completion_rate(counts: ImageCounts) -> float:
    if counts.total <= 0:
        return 0.0
    return round((counts.processed / counts.total) * 100, 1)
