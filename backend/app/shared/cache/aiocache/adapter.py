"""aiocache Redis adapter for disposable query results."""

from __future__ import annotations

import asyncio
from typing import Any
from urllib.parse import unquote, urlparse

from aiocache import RedisCache
from aiocache.serializers import JsonSerializer

from app.core.config import cache_settings


class AiocacheRedisAdapter:
    """Own one aiocache connection pool for the process lifecycle."""

    def __init__(
        self,
        *,
        url: str,
        namespace: str,
        timeout: float,
        pool_size: int,
        enabled: bool,
    ) -> None:
        self._url = url
        self._namespace = namespace
        self._timeout = timeout
        self._pool_size = pool_size
        self._enabled = enabled
        self._cache: RedisCache | None = None
        self._start_lock = asyncio.Lock()

    @property
    def enabled(self) -> bool:
        return self._enabled

    async def start(self) -> None:
        if not self._enabled or self._cache is not None:
            return
        async with self._start_lock:
            if self._cache is not None:
                return
            parsed = urlparse(self._url)
            if parsed.scheme not in {"redis", "rediss"} or not parsed.hostname:
                raise ValueError("REDIS_CACHE_URL must be a redis:// or rediss:// URL")
            cache = RedisCache(
                endpoint=parsed.hostname,
                port=parsed.port or 6379,
                db=int(parsed.path.lstrip("/") or 0),
                password=unquote(parsed.password) if parsed.password else None,
                namespace=self._namespace,
                timeout=self._timeout,
                create_connection_timeout=self._timeout,
                pool_max_size=self._pool_size,
                ssl=parsed.scheme == "rediss",
                connection_pool_kwargs=(
                    {"username": unquote(parsed.username)} if parsed.username else None
                ),
                serializer=JsonSerializer(),
            )
            try:
                await cache.raw("ping")
            except Exception:
                await cache.close()
                raise
            self._cache = cache

    async def stop(self) -> None:
        cache = self._cache
        self._cache = None
        if cache is not None:
            await cache.close()

    async def _get_or_start(self) -> RedisCache:
        await self.start()
        if self._cache is None:
            raise RuntimeError("查询缓存客户端尚未初始化")
        return self._cache

    async def get(self, key: str) -> Any | None:
        if not self._enabled:
            return None
        return await (await self._get_or_start()).get(key)

    async def set(self, key: str, value: Any, *, ttl: int) -> bool:
        if not self._enabled:
            return False
        return bool(await (await self._get_or_start()).set(key, value, ttl=ttl))

    async def delete(self, key: str) -> int:
        if not self._enabled:
            return 0
        return int(await (await self._get_or_start()).delete(key))

    async def increment(self, key: str, amount: int = 1) -> int:
        if not self._enabled:
            return 0
        return int(await (await self._get_or_start()).increment(key, amount))

    async def ping(self) -> bool:
        if not self._enabled:
            return False
        try:
            return bool(await (await self._get_or_start()).raw("ping"))
        except Exception:  # noqa: BLE001 - health checks report unavailability.
            return False


query_cache = AiocacheRedisAdapter(
    url=cache_settings.REDIS_CACHE_URL,
    namespace=cache_settings.CACHE_NAMESPACE,
    timeout=cache_settings.CACHE_OPERATION_TIMEOUT_SECONDS,
    pool_size=cache_settings.CACHE_POOL_SIZE,
    enabled=cache_settings.CACHE_ENABLED,
)
