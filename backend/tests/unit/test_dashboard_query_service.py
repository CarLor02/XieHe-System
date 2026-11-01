"""Dashboard 跨上下文读模型单元测试。"""

from __future__ import annotations

from datetime import datetime

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.dashboard.application import DashboardQueryService
from app.contexts.dashboard.domain import ImageCounts, PatientCounts


def principal() -> AccessPrincipal:
    return {
        "id": 10,
        "user_id": 10,
        "username": "doctor",
        "email": "doctor@example.com",
        "roles": ["doctor"],
        "permissions": [],
        "is_active": True,
        "is_superuser": False,
        "is_system_admin": False,
        "system_admin_level": 0,
    }


class PatientReader:
    def counts(self, *, today_start: datetime, week_start: datetime) -> PatientCounts:
        del today_start, week_start
        return PatientCounts(total=8, today=1, week=3, active=6)


class ImagingReader:
    def __init__(
        self,
        counts: ImageCounts,
    ) -> None:
        self.image_counts = counts

    def counts(
        self,
        *,
        principal: AccessPrincipal,
        today_start: datetime,
        week_start: datetime,
    ) -> ImageCounts:
        del principal, today_start, week_start
        return self.image_counts


def service(
    *,
    images: ImageCounts,
) -> DashboardQueryService:
    return DashboardQueryService(
        PatientReader(),
        ImagingReader(images),
        now=lambda: datetime(2026, 8, 11, 9, 30),
    )


def test_overview_combines_counts_and_calculates_completion_rate() -> None:
    result = service(
        images=ImageCounts(total=10, today=2, week=6, pending=3, processed=5)
    ).overview(principal())

    assert result.total_patients == 8
    assert result.active_patients == 6
    assert result.total_images == 10
    assert result.completion_rate == 50.0
    assert result.generated_at == datetime(2026, 8, 11, 9, 30)


def test_overview_zero_images_has_zero_completion_rate() -> None:
    result = service(
        images=ImageCounts(total=0, today=0, week=0, pending=0, processed=0)
    ).overview(principal())
    assert result.completion_rate == 0.0
