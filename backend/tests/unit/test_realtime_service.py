import pytest

from app.services import realtime_service as realtime_module


@pytest.fixture(autouse=True)
def reset_realtime_globals() -> None:
    realtime_module.realtime_service = None
    realtime_module._realtime_leader_refresh_task = None
    yield
    realtime_module.realtime_service = None
    realtime_module._realtime_leader_refresh_task = None


@pytest.mark.asyncio
async def test_start_realtime_service_skips_when_leader_lock_is_busy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    started = False

    class FakeRealtimeDataService:
        async def start_service(self) -> None:
            nonlocal started
            started = True

    monkeypatch.setattr(realtime_module, "_try_acquire_realtime_leader", lambda: False, raising=False)
    monkeypatch.setattr(realtime_module, "RealtimeDataService", FakeRealtimeDataService)

    await realtime_module.start_realtime_service()

    assert started is False
    assert realtime_module.realtime_service is None


@pytest.mark.asyncio
async def test_start_realtime_service_releases_leader_after_service_stops(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[str] = []

    class FakeRealtimeDataService:
        async def start_service(self) -> None:
            calls.append("start")

    monkeypatch.setattr(realtime_module, "_try_acquire_realtime_leader", lambda: True, raising=False)
    monkeypatch.setattr(realtime_module, "_start_realtime_leader_refresh", lambda: None, raising=False)
    monkeypatch.setattr(realtime_module, "RealtimeDataService", FakeRealtimeDataService)

    def release() -> None:
        calls.append("release")

    monkeypatch.setattr(realtime_module, "_release_realtime_leader", release, raising=False)

    await realtime_module.start_realtime_service()

    assert calls == ["start", "release"]
