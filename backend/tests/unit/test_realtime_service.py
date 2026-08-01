import pytest

from app.services import realtime_service as realtime_module


@pytest.fixture(autouse=True)
def reset_realtime_globals() -> None:
    realtime_module.realtime_service = None
    realtime_module._realtime_leader_refresh_task = None
    realtime_module._realtime_stopping = False
    yield
    realtime_module.realtime_service = None
    realtime_module._realtime_leader_refresh_task = None
    realtime_module._realtime_stopping = False


@pytest.mark.asyncio
async def test_start_realtime_service_retries_when_leader_lock_is_busy(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    started = False

    class FakeRealtimeDataService:
        async def start_service(self) -> None:
            nonlocal started
            started = True

    async def acquire_once() -> bool:
        realtime_module._realtime_stopping = True
        return False

    async def no_wait(_seconds: float) -> None:
        return None

    monkeypatch.setattr(realtime_module, "_try_acquire_realtime_leader", acquire_once)
    monkeypatch.setattr(realtime_module.asyncio, "sleep", no_wait)
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
            realtime_module._realtime_stopping = True

    async def acquire() -> bool:
        return True

    monkeypatch.setattr(realtime_module, "_try_acquire_realtime_leader", acquire)
    monkeypatch.setattr(realtime_module, "_start_realtime_leader_refresh", lambda: None, raising=False)
    monkeypatch.setattr(realtime_module, "RealtimeDataService", FakeRealtimeDataService)

    async def release() -> None:
        calls.append("release")

    monkeypatch.setattr(realtime_module, "_release_realtime_leader", release, raising=False)

    await realtime_module.start_realtime_service()

    assert calls == ["start", "release"]
