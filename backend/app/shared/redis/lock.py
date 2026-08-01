"""Owner-safe distributed lease built on the durable Redis state instance."""

from __future__ import annotations

import secrets

from redis.exceptions import RedisError

from .client import RedisStateClientManager, state_redis
from .exceptions import RedisStateUnavailable

RENEW_SCRIPT = """
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('expire', KEYS[1], ARGV[2])
end
return 0
"""

RELEASE_SCRIPT = """
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
"""


class RedisDistributedLock:
    """A renewable lease that only its random owner token may mutate."""

    def __init__(
        self,
        key: str,
        *,
        ttl_seconds: int,
        manager: RedisStateClientManager = state_redis,
        owner_token: str | None = None,
    ) -> None:
        self.key = key
        self.ttl_seconds = ttl_seconds
        self.owner_token = owner_token or secrets.token_urlsafe(32)
        self._manager = manager

    async def acquire(self) -> bool:
        try:
            client = await self._manager.get_or_start()
            return bool(
                await client.set(
                    self.key,
                    self.owner_token,
                    nx=True,
                    ex=self.ttl_seconds,
                )
            )
        except (RedisError, OSError, RuntimeError) as exc:
            raise RedisStateUnavailable(f"Redis lock acquire failed: {exc}") from exc

    async def renew(self) -> bool:
        try:
            client = await self._manager.get_or_start()
            result = await client.eval(
                RENEW_SCRIPT,
                1,
                self.key,
                self.owner_token,
                self.ttl_seconds,
            )
            return bool(result)
        except (RedisError, OSError, RuntimeError) as exc:
            raise RedisStateUnavailable(f"Redis lock renew failed: {exc}") from exc

    async def release(self) -> bool:
        try:
            client = await self._manager.get_or_start()
            result = await client.eval(
                RELEASE_SCRIPT,
                1,
                self.key,
                self.owner_token,
            )
            return bool(result)
        except (RedisError, OSError, RuntimeError) as exc:
            raise RedisStateUnavailable(f"Redis lock release failed: {exc}") from exc
