from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest

from app.tasks import object_cleanup


class FakeRedis:
    def __init__(self, acquire: bool = True) -> None:
        self.acquire = acquire
        self.value: str | None = None
        self.set_calls: list[dict[str, object]] = []
        self.delete_calls: list[str] = []
        self.expire_calls: list[tuple[str, int]] = []

    def set(self, key: str, value: str, nx: bool, ex: int) -> bool:
        self.set_calls.append({"key": key, "value": value, "nx": nx, "ex": ex})
        if not self.acquire:
            return False
        self.value = value
        return True

    def get(self, key: str) -> str | None:
        return self.value

    def expire(self, key: str, ttl: int) -> bool:
        self.expire_calls.append((key, ttl))
        return True

    def delete(self, key: str) -> int:
        self.delete_calls.append(key)
        self.value = None
        return 1


@pytest.mark.asyncio
async def test_object_cleanup_scheduler_skips_when_leader_lock_exists(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_redis = FakeRedis(acquire=False)
    cleanup_calls: list[str] = []

    monkeypatch.setattr(
        object_cleanup,
        "get_cache_manager",
        lambda: SimpleNamespace(redis_client=fake_redis),
    )
    monkeypatch.setattr(object_cleanup.logger, "emit_event", lambda *args, **kwargs: True)
    monkeypatch.setattr(object_cleanup, "cleanup_soft_deleted_objects", lambda: cleanup_calls.append("cleanup"))

    await object_cleanup.start_object_cleanup_scheduler()

    assert fake_redis.set_calls == [
        {
            "key": object_cleanup.OBJECT_CLEANUP_LEADER_LOCK_KEY,
            "value": object_cleanup.OBJECT_CLEANUP_LEADER_TOKEN,
            "nx": True,
            "ex": object_cleanup.OBJECT_CLEANUP_LEADER_LOCK_TTL_SECONDS,
        }
    ]
    assert cleanup_calls == []


@pytest.mark.asyncio
async def test_object_cleanup_scheduler_releases_owned_leader_lock(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fake_redis = FakeRedis(acquire=True)
    cleanup_calls: list[str] = []

    async def fake_cleanup() -> None:
        cleanup_calls.append("cleanup")
        raise asyncio.CancelledError

    monkeypatch.setattr(
        object_cleanup,
        "get_cache_manager",
        lambda: SimpleNamespace(redis_client=fake_redis),
    )
    monkeypatch.setattr(object_cleanup.logger, "emit_event", lambda *args, **kwargs: True)
    monkeypatch.setattr(object_cleanup, "_seconds_until_next_midnight", lambda: 0)
    monkeypatch.setattr(object_cleanup, "cleanup_soft_deleted_objects", fake_cleanup)

    with pytest.raises(asyncio.CancelledError):
        await object_cleanup.start_object_cleanup_scheduler()

    assert cleanup_calls == ["cleanup"]
    assert fake_redis.delete_calls == [object_cleanup.OBJECT_CLEANUP_LEADER_LOCK_KEY]
