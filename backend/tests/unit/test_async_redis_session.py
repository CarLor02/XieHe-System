from __future__ import annotations

import redis.asyncio as async_redis

from app.core.database.session import get_async_redis


def test_get_async_redis_returns_async_client() -> None:
    client = get_async_redis()

    assert isinstance(client, async_redis.Redis)
