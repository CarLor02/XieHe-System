"""JSON state store for authentication and other durable ephemeral state."""

from __future__ import annotations

import json
from typing import Any, Protocol

from redis.exceptions import RedisError

from .client import RedisStateClientManager, state_redis
from .exceptions import RedisStateUnavailable


class StateStore(Protocol):
    """Application-facing durable state operations."""

    async def get(self, key: str) -> Any | None: ...

    async def set(self, key: str, value: Any, *, ttl: int) -> bool: ...

    async def delete(self, key: str) -> int: ...

    async def exists(self, key: str) -> bool: ...


class RedisJsonStateStore:
    """Preserve the legacy JSON wire format while using async redis-py."""

    def __init__(self, manager: RedisStateClientManager) -> None:
        self._manager = manager

    @staticmethod
    def _unavailable(exc: Exception) -> RedisStateUnavailable:
        return RedisStateUnavailable(f"Redis state operation failed: {exc}")

    async def get(self, key: str) -> Any | None:
        try:
            value = await (await self._manager.get_or_start()).get(key)
            return json.loads(value) if value is not None else None
        except (RedisError, OSError, RuntimeError, json.JSONDecodeError) as exc:
            raise self._unavailable(exc) from exc

    async def set(self, key: str, value: Any, *, ttl: int) -> bool:
        try:
            payload = json.dumps(value, ensure_ascii=False, default=str)
            return bool(
                await (await self._manager.get_or_start()).set(key, payload, ex=ttl)
            )
        except (RedisError, OSError, RuntimeError, TypeError) as exc:
            raise self._unavailable(exc) from exc

    async def delete(self, key: str) -> int:
        try:
            return int(await (await self._manager.get_or_start()).delete(key))
        except (RedisError, OSError, RuntimeError) as exc:
            raise self._unavailable(exc) from exc

    async def exists(self, key: str) -> bool:
        try:
            return bool(await (await self._manager.get_or_start()).exists(key))
        except (RedisError, OSError, RuntimeError) as exc:
            raise self._unavailable(exc) from exc


security_state_store = RedisJsonStateStore(state_redis)
