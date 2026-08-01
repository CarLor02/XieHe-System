"""Reusable cache-aside and generation-based invalidation services."""

from __future__ import annotations

from collections.abc import Awaitable, Callable
from typing import Any, TypeVar

from app.core.system.logger import LogLevel, logger

from .contracts import AsyncCache
from .keys import build_cache_key

T = TypeVar("T")


class CacheAsideService:
    """Read through a disposable cache while treating the database as truth."""

    def __init__(self, cache: AsyncCache) -> None:
        self._cache = cache

    async def get_or_load(
        self,
        key: str,
        *,
        ttl: int,
        loader: Callable[[], Awaitable[T]],
        cache_if: Callable[[T], bool] | None = None,
    ) -> T:
        if self._cache.enabled:
            try:
                cached_value = await self._cache.get(key)
                if cached_value is not None:
                    return cached_value
            except Exception as exc:  # noqa: BLE001 - cache failure must fall back to DB.
                logger.emit_event(LogLevel.WARNING, message=f"查询缓存读取失败，回退数据库: {exc}")

        value = await loader()
        should_cache = cache_if(value) if cache_if is not None else value is not None
        if self._cache.enabled and should_cache:
            try:
                await self._cache.set(key, value, ttl=ttl)
            except Exception as exc:  # noqa: BLE001 - cache write is best effort.
                logger.emit_event(LogLevel.WARNING, message=f"查询缓存写入失败: {exc}")
        return value


class CacheGenerationService:
    """Version cache namespaces so stale concurrent writes become unreachable."""

    def __init__(self, cache: AsyncCache) -> None:
        self._cache = cache

    async def current(self, namespace: str) -> int:
        if not self._cache.enabled:
            return 0
        try:
            value = await self._cache.get(build_cache_key("generation", namespace))
            return int(value) if value is not None else 0
        except Exception as exc:  # noqa: BLE001 - generation lookup must also fall back.
            logger.emit_event(LogLevel.WARNING, message=f"缓存代际读取失败，回退数据库: {exc}")
            return 0

    async def bump(self, namespace: str) -> int:
        if not self._cache.enabled:
            return 0
        return await self._cache.increment(build_cache_key("generation", namespace))

    async def bump_best_effort(self, *namespaces: str) -> None:
        for namespace in dict.fromkeys(namespaces):
            try:
                await self.bump(namespace)
            except Exception as exc:  # noqa: BLE001 - committed DB writes remain successful.
                logger.emit_event(
                    LogLevel.ERROR,
                    message=f"缓存命名空间失效失败 {namespace}: {exc}",
                )
