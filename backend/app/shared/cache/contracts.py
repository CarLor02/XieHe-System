"""Transport-independent asynchronous query-cache contracts."""

from __future__ import annotations

from typing import Any, Protocol


class AsyncCache(Protocol):
    """Minimal cache interface consumed by application query services."""

    @property
    def enabled(self) -> bool:
        """Return whether cache reads and writes are enabled."""

    async def get(self, key: str) -> Any | None:
        """Return a cached JSON-compatible value or ``None`` on a miss."""

    async def set(self, key: str, value: Any, *, ttl: int) -> bool:
        """Store a JSON-compatible value."""

    async def delete(self, key: str) -> int:
        """Delete one key and return the number of removed entries."""

    async def increment(self, key: str, amount: int = 1) -> int:
        """Atomically increment an integer value."""

    async def ping(self) -> bool:
        """Check whether the backing cache is reachable."""
