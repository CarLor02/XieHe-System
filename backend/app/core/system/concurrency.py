"""Per-worker concurrency gates for expensive request paths."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import HTTPException, status

from app.core.config import settings


class ConcurrencyLimitExceeded(RuntimeError):
    """Raised when a named concurrency gate has no free slot."""

    def __init__(self, name: str, limit: int) -> None:
        super().__init__(f"{name} concurrency limit exceeded: {limit}")
        self.name = name
        self.limit = limit


class ConcurrencyGate:
    """Reject new async work immediately when the active count reaches a limit."""

    def __init__(self, *, name: str, limit: int) -> None:
        self.name = name
        self.limit = max(1, int(limit))
        self._active = 0
        self._lock = asyncio.Lock()

    @property
    def active(self) -> int:
        """Return the current number of active slots."""
        return self._active

    @asynccontextmanager
    async def acquire(self) -> AsyncIterator[None]:
        """Enter the gate or raise immediately when no slot is available."""
        async with self._lock:
            if self._active >= self.limit:
                raise ConcurrencyLimitExceeded(self.name, self.limit)
            self._active += 1

        try:
            yield
        finally:
            async with self._lock:
                self._active = max(0, self._active - 1)


ai_object_gate = ConcurrencyGate(
    name="ai_object",
    limit=settings.AI_OBJECT_CONCURRENCY_LIMIT,
)
batch_presign_gate = ConcurrencyGate(
    name="batch_presign",
    limit=settings.BATCH_PRESIGN_CONCURRENCY_LIMIT,
)
legacy_diagnosis_gate = ConcurrencyGate(
    name="legacy_diagnosis",
    limit=settings.LEGACY_DIAGNOSIS_CONCURRENCY_LIMIT,
)
report_export_gate = ConcurrencyGate(
    name="report_export",
    limit=settings.REPORT_EXPORT_CONCURRENCY_LIMIT,
)


async def _require_slot(gate: ConcurrencyGate, detail: str) -> AsyncIterator[None]:
    """Hold a concurrency slot for the full FastAPI request lifetime."""
    try:
        async with gate.acquire():
            yield
    except ConcurrencyLimitExceeded as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
        ) from exc


async def require_ai_object_slot() -> AsyncIterator[None]:
    """Limit concurrent AI object model requests."""
    async for item in _require_slot(ai_object_gate, "AI模型请求繁忙，请稍后重试"):
        yield item


async def require_batch_presign_slot() -> AsyncIterator[None]:
    """Limit concurrent batch presign requests."""
    async for item in _require_slot(batch_presign_gate, "批量影像访问地址请求繁忙，请稍后重试"):
        yield item


async def require_legacy_diagnosis_slot() -> AsyncIterator[None]:
    """Limit concurrent legacy diagnosis requests."""
    async for item in _require_slot(legacy_diagnosis_gate, "AI诊断请求繁忙，请稍后重试"):
        yield item


async def require_report_export_slot() -> AsyncIterator[None]:
    """Limit concurrent report export requests."""
    async for item in _require_slot(report_export_gate, "报告导出请求繁忙，请稍后重试"):
        yield item
