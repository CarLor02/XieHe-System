from __future__ import annotations

import pytest

from app.api.v1.api import api_router
from app.contexts.system_management.application import HealthCheckApplicationService
from app.contexts.system_management.application.dto import SystemCounts
from app.contexts.system_management.application.system_management_service import (
    SystemManagementApplicationService,
)
from app.contexts.system_management.infrastructure.probes import (
    CpuHealthProbe,
    HostMetricsProbe,
    RedisHealthProbe,
    host_health_probes,
    psutil_resource_probe,
)
from app.shared.cache.aiocache import query_cache
from app.shared.redis import state_redis


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

    monkeypatch.setattr(host_health_probes.psutil, "cpu_percent", fake_cpu_percent)
    monkeypatch.setattr(host_health_probes.psutil, "cpu_count", lambda: 4)
    monkeypatch.setattr(
        host_health_probes.psutil,
        "getloadavg",
        lambda: (0.1, 0.2, 0.3),
        raising=False,
    )

    result = await CpuHealthProbe().check()

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

    monkeypatch.setattr(state_redis, "ping", state_unavailable)
    monkeypatch.setattr(query_cache, "ping", cache_healthy)

    result = await RedisHealthProbe(state_redis, query_cache).check()

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


def test_public_router_mounts_both_health_contracts() -> None:
    paths = {route.path for route in api_router.routes}

    assert "/health/" in paths
    assert "/health/detailed" in paths
    assert "/health/readiness" in paths
    assert "/health/liveness" in paths
    assert "/system/health" in paths


@pytest.mark.asyncio
async def test_readiness_depends_only_on_database_health() -> None:
    class DatabaseProbe:
        name = "database"

        async def check(self):
            from datetime import datetime

            from app.contexts.system_management.application.dto import ComponentHealth

            return ComponentHealth(
                name=self.name,
                status="healthy",
                response_time=0,
                details={},
                last_check=datetime.now(),
            )

        async def test(self):
            return None

    service = HealthCheckApplicationService([DatabaseProbe()], HostMetricsProbe())

    assert await service.ready() is True
