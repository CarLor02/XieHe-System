"""Lifecycle owner for the durable Redis state client."""

from __future__ import annotations

import asyncio

from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.config import redis_settings

from .exceptions import RedisStateUnavailable


class RedisStateClientManager:
    """Create and close one redis-py asyncio client per worker process."""

    def __init__(self, *, url: str, timeout: float, pool_size: int) -> None:
        self._url = url
        self._timeout = timeout
        self._pool_size = pool_size
        self._client: Redis | None = None
        self._start_lock = asyncio.Lock()

    async def start(self) -> None:
        if self._client is not None:
            return
        async with self._start_lock:
            if self._client is not None:
                return
            client = Redis.from_url(
                self._url,
                encoding="utf-8",
                decode_responses=True,
                max_connections=self._pool_size,
                socket_timeout=self._timeout,
                socket_connect_timeout=self._timeout,
                health_check_interval=30,
            )
            try:
                await client.ping()
            except Exception:
                await client.aclose()
                raise
            self._client = client

    async def stop(self) -> None:
        client = self._client
        self._client = None
        if client is not None:
            await client.aclose()

    def get(self) -> Redis:
        if self._client is None:
            raise RedisStateUnavailable("Redis state client is not available")
        return self._client

    async def get_or_start(self) -> Redis:
        """Reconnect lazily after a failed application startup attempt."""

        try:
            await self.start()
            return self.get()
        except RedisStateUnavailable:
            raise
        except Exception as exc:
            raise RedisStateUnavailable(f"Redis state client is not available: {exc}") from exc

    async def ping(self) -> bool:
        try:
            return bool(await (await self.get_or_start()).ping())
        except (RedisStateUnavailable, RedisError, OSError):
            return False


state_redis = RedisStateClientManager(
    url=redis_settings.REDIS_STATE_URL,
    timeout=redis_settings.REDIS_TIMEOUT,
    pool_size=redis_settings.REDIS_STATE_POOL_SIZE,
)
