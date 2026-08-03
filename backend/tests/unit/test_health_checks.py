from __future__ import annotations

import pytest

from app.api.v1.endpoints.system.handlers import health
from app.contexts.system_management.application.dto import SystemCounts
from app.contexts.system_management.application.system_management_service import (
    SystemManagementApplicationService,
)
from app.contexts.system_management.infrastructure.probes import psutil_resource_probe


class _FakeSystemRepository:
    def list_configs(self, **_kwargs):
        return []

    def get_counts(self) -> SystemCounts:
        return SystemCounts(0, 0, 0, 0)

    def database_is_healthy(self) -> bool:
        return True


@pytest.mark.asyncio
async def test_cpu_health_check_does_not_block_for_sampling(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    intervals: list[float | None] = []

    def fake_cpu_percent(interval: float | None = None) -> float:
        intervals.append(interval)
        return 12.5

    monkeypatch.setattr(health.psutil, "cpu_percent", fake_cpu_percent)
    monkeypatch.setattr(health.psutil, "cpu_count", lambda: 4)
    monkeypatch.setattr(
        health.psutil, "getloadavg", lambda: (0.1, 0.2, 0.3), raising=False
    )

    result = await health.check_cpu_health()

    assert result.status == "healthy"
    assert intervals == [None]


@pytest.mark.asyncio
async def test_redis_health_reports_state_and_query_cache_independently(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def state_unavailable() -> bool:
        return False

    async def cache_healthy() -> bool:
        return True

    monkeypatch.setattr(health.state_redis, "ping", state_unavailable)
    monkeypatch.setattr(health.query_cache, "ping", cache_healthy)

    result = await health.check_redis_health()

    assert result.status == "unhealthy"
    assert result.details["state"] == "unhealthy"
    assert result.details["query_cache"] == "healthy"


def test_system_management_probe_does_not_block_for_cpu_sampling(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    intervals: list[float | None] = []

    def fake_cpu_percent(interval: float | None = None) -> float:
        intervals.append(interval)
        return 12.5

    monkeypatch.setattr(psutil_resource_probe.psutil, "cpu_percent", fake_cpu_percent)
    monkeypatch.setattr(psutil_resource_probe.psutil, "boot_time", lambda: 0)
    monkeypatch.setattr(
        psutil_resource_probe.psutil,
        "virtual_memory",
        lambda: type("Memory", (), {"percent": 20.0})(),
    )
    monkeypatch.setattr(
        psutil_resource_probe.psutil,
        "disk_usage",
        lambda _path: type("Disk", (), {"percent": 30.0})(),
    )

    repository = _FakeSystemRepository()
    service = SystemManagementApplicationService(
        repository,
        repository,
        psutil_resource_probe.PsutilResourceProbe(),
    )
    service.get_stats()
    service.get_health()

    assert intervals == [None, None]
