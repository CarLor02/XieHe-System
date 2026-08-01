from __future__ import annotations

from typing import Any

import pytest

from app.shared.cache.service import CacheAsideService, CacheGenerationService


class FakeCache:
    enabled = True

    def __init__(self) -> None:
        self.values: dict[str, Any] = {}
        self.fail_reads = False
        self.fail_writes = False

    async def get(self, key):
        if self.fail_reads:
            raise ConnectionError("cache unavailable")
        return self.values.get(key)

    async def set(self, key, value, *, ttl):
        if self.fail_writes:
            raise ConnectionError("cache unavailable")
        self.values[key] = value
        return True

    async def delete(self, key):
        return int(self.values.pop(key, None) is not None)

    async def increment(self, key, amount=1):
        self.values[key] = int(self.values.get(key, 0)) + amount
        return self.values[key]


@pytest.mark.asyncio
async def test_cache_aside_reuses_cached_result() -> None:
    cache = FakeCache()
    service = CacheAsideService(cache)
    load_count = 0

    async def load():
        nonlocal load_count
        load_count += 1
        return {"value": 1}

    assert await service.get_or_load("key", ttl=60, loader=load) == {"value": 1}
    assert await service.get_or_load("key", ttl=60, loader=load) == {"value": 1}
    assert load_count == 1


@pytest.mark.asyncio
async def test_cache_aside_falls_back_when_cache_is_unavailable() -> None:
    cache = FakeCache()
    cache.fail_reads = True
    cache.fail_writes = True
    service = CacheAsideService(cache)

    async def load():
        return ["database"]

    assert await service.get_or_load("key", ttl=60, loader=load) == ["database"]


@pytest.mark.asyncio
async def test_generation_read_failure_uses_zero_generation() -> None:
    cache = FakeCache()
    cache.fail_reads = True

    assert await CacheGenerationService(cache).current("patients:list") == 0
