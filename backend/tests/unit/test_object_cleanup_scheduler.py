from __future__ import annotations

import pytest

from app.tasks import object_cleanup


class FakeLock:
    def __init__(self, acquire: bool = True) -> None:
        self.acquire_result = acquire
        self.acquire_calls = 0
        self.release_calls = 0

    async def acquire(self) -> bool:
        self.acquire_calls += 1
        return self.acquire_result

    async def renew(self) -> bool:
        return True

    async def release(self) -> bool:
        self.release_calls += 1
        return True


@pytest.mark.asyncio
async def test_object_cleanup_leader_reports_existing_lock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_lock = FakeLock(acquire=False)
    monkeypatch.setattr(object_cleanup, "_object_cleanup_lock", fake_lock)
    monkeypatch.setattr(object_cleanup.logger, "emit_event", lambda *args, **kwargs: True)

    assert await object_cleanup._try_acquire_object_cleanup_leader() is False
    assert fake_lock.acquire_calls == 1


@pytest.mark.asyncio
async def test_object_cleanup_release_uses_owner_safe_lock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_lock = FakeLock(acquire=True)
    monkeypatch.setattr(object_cleanup, "_object_cleanup_lock", fake_lock)
    monkeypatch.setattr(object_cleanup.logger, "emit_event", lambda *args, **kwargs: True)

    await object_cleanup._release_object_cleanup_leader()

    assert fake_lock.release_calls == 1
