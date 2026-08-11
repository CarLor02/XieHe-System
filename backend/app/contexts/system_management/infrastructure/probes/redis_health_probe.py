"""Redis state and query-cache health adapter."""

import asyncio
import time
from datetime import datetime

from app.contexts.system_management.application.dto import (
    ComponentHealth,
    ComponentTestResult,
)
from app.contexts.system_management.domain import HealthStatus
from app.shared.cache.aiocache import AiocacheRedisAdapter
from app.shared.redis import RedisStateClientManager


class RedisHealthProbe:
    name = "redis"

    def __init__(
        self,
        state: RedisStateClientManager,
        cache: AiocacheRedisAdapter,
    ) -> None:
        self._state = state
        self._cache = cache

    async def _ping(self) -> tuple[bool, bool]:
        return await asyncio.gather(
            self._state.ping(),
            self._cache.ping()
            if self._cache.enabled
            else asyncio.sleep(0, result=True),
        )

    async def check(self) -> ComponentHealth:
        started = time.perf_counter()
        state_ok, cache_ok = await self._ping()
        status: HealthStatus = (
            "healthy"
            if state_ok and cache_ok
            else "unhealthy"
            if not state_ok
            else "warning"
        )
        return ComponentHealth(
            name=self.name,
            status=status,
            response_time=(time.perf_counter() - started) * 1000,
            details={
                "state": "healthy" if state_ok else "unhealthy",
                "query_cache": (
                    "disabled"
                    if not self._cache.enabled
                    else "healthy"
                    if cache_ok
                    else "unavailable"
                ),
                "query_cache_fallback": not self._cache.enabled or not cache_ok,
            },
            last_check=datetime.now(),
        )

    async def test(self) -> ComponentTestResult:
        state_ok, cache_ok = await self._ping()
        return ComponentTestResult(
            component=self.name,
            passed=state_ok and cache_ok,
            details={
                "state": "ok" if state_ok else "failed",
                "query_cache": (
                    "disabled"
                    if not self._cache.enabled
                    else "ok"
                    if cache_ok
                    else "failed"
                ),
            },
        )
