from __future__ import annotations

import pytest

from app.api.v1.endpoints.system.handlers import health, management


class _FakeDB:
    def execute(self, *_args, **_kwargs):
        return self

    def scalar(self) -> int:
        return 0


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


@pytest.mark.asyncio
async def test_management_health_endpoints_do_not_block_for_cpu_sampling(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    intervals: list[float | None] = []

    def fake_cpu_percent(interval: float | None = None) -> float:
        intervals.append(interval)
        return 12.5

    monkeypatch.setattr(management.psutil, "cpu_percent", fake_cpu_percent)
    monkeypatch.setattr(management.psutil, "boot_time", lambda: 0)
    monkeypatch.setattr(
        management.psutil,
        "virtual_memory",
        lambda: type("Memory", (), {"percent": 20.0})(),
    )
    monkeypatch.setattr(
        management.psutil,
        "disk_usage",
        lambda _path: type("Disk", (), {"percent": 30.0})(),
    )

    await management.get_system_stats(db=_FakeDB(), current_user={"id": 1})
    await management.system_health(db=_FakeDB())

    assert intervals == [None, None]
