"""Dashboard 跨上下文读模型单元测试。"""

from __future__ import annotations

from datetime import datetime

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.dashboard.application import DashboardQueryService
from app.contexts.dashboard.domain import ImageCounts, PatientCounts, RecentActivity


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
    def __init__(self, activities: list[RecentActivity] | None = None) -> None:
        self.activities = activities or []

    def counts(self, *, today_start: datetime, week_start: datetime) -> PatientCounts:
        del today_start, week_start
        return PatientCounts(total=8, today=1, week=3, active=6)

    def recent(self, limit: int) -> list[RecentActivity]:
        return self.activities[:limit]


class ImagingReader:
    def __init__(
        self,
        counts: ImageCounts,
        activities: list[RecentActivity] | None = None,
    ) -> None:
        self.image_counts = counts
        self.activities = activities or []

    def counts(
        self,
        *,
        principal: AccessPrincipal,
        today_start: datetime,
        week_start: datetime,
    ) -> ImageCounts:
        del principal, today_start, week_start
        return self.image_counts

    def recent(self, *, principal: AccessPrincipal, limit: int) -> list[RecentActivity]:
        del principal
        return self.activities[:limit]


class ReportReader:
    def __init__(self, activities: list[RecentActivity] | None = None) -> None:
        self.activities = activities or []

    def recent(self, limit: int) -> list[RecentActivity]:
        return self.activities[:limit]


def service(
    *,
    images: ImageCounts,
    patients: list[RecentActivity] | None = None,
    image_activities: list[RecentActivity] | None = None,
    reports: list[RecentActivity] | None = None,
) -> DashboardQueryService:
    return DashboardQueryService(
        PatientReader(patients),
        ImagingReader(images, image_activities),
        ReportReader(reports),
        now=lambda: datetime(2026, 8, 11, 9, 30),
    )


def activity(identifier: int, kind: str, hour: int) -> RecentActivity:
    return RecentActivity(
        id=identifier,
        type=kind,
        title=kind,
        description=kind,
        timestamp=datetime(2026, 8, 11, hour),
        status="new",
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


def test_recent_activities_merge_sort_and_limit_sources() -> None:
    query = service(
        images=ImageCounts(total=1, today=1, week=1, pending=1, processed=0),
        patients=[activity(1, "patient", 8), activity(2, "patient", 4)],
        image_activities=[activity(3, "image", 9), activity(4, "image", 3)],
        reports=[activity(5, "report", 7), activity(6, "report", 2)],
    )
    result = query.recent_activities(principal(), limit=6)
    assert [item.id for item in result] == [3, 1, 5, 2, 4, 6]
