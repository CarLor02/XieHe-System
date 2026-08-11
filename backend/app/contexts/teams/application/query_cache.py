"""Shared cache coordination for team queries and mutations."""

from collections.abc import Awaitable, Callable
from typing import TypeVar

from app.core.config import cache_settings
from app.shared.cache.aiocache import query_cache
from app.shared.cache.service import CacheAsideService, CacheGenerationService

from .cache_namespaces import TEAM_QUERY_NAMESPACE

T = TypeVar("T")


class TeamQueryCache:
    def __init__(
        self,
        cache: CacheAsideService | None = None,
        generations: CacheGenerationService | None = None,
    ) -> None:
        self._cache = cache or CacheAsideService(query_cache)
        self._generations = generations or CacheGenerationService(query_cache)

    async def generation(self) -> int:
        return await self._generations.current(TEAM_QUERY_NAMESPACE)

    async def invalidate(self) -> None:
        await self._generations.bump_best_effort(TEAM_QUERY_NAMESPACE)

    async def get_or_load(
        self,
        key: str,
        loader: Callable[[], Awaitable[T]],
    ) -> T:
        return await self._cache.get_or_load(
            key,
            ttl=cache_settings.TEAM_QUERY_CACHE_TTL_SECONDS,
            loader=loader,
        )
