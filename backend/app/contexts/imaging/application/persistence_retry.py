"""影像写用例共享的瞬时数据库事务重试策略。"""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from typing import TypeVar

from app.core.system.logger import LogLevel, logger

from .errors import RetryablePersistenceError

T = TypeVar("T")
Sleep = Callable[[float], Awaitable[None]]


@dataclass(frozen=True, slots=True)
class PersistenceRetryPolicy:
    max_attempts: int = 3
    base_delay_seconds: float = 0.05


async def run_with_persistence_retry(
    operation: Callable[[], T],
    *,
    rollback: Callable[[], None],
    operation_name: str,
    policy: PersistenceRetryPolicy = PersistenceRetryPolicy(),
    sleep: Sleep = asyncio.sleep,
) -> T:
    """仅重试已被基础设施判定为瞬时锁竞争的完整数据库阶段。"""

    attempts = max(1, policy.max_attempts)
    for attempt in range(1, attempts + 1):
        try:
            return operation()
        except RetryablePersistenceError as exc:
            rollback()
            if attempt >= attempts:
                raise
            delay = policy.base_delay_seconds * (2 ** (attempt - 1))
            logger.emit_event(
                LogLevel.WARNING,
                message=(
                    f"影像事务发生瞬时锁竞争，准备重试: operation={operation_name}, "
                    f"attempt={attempt + 1}/{attempts}, delay={delay:.3f}s, "
                    f"error={exc}"
                ),
            )
            await sleep(delay)

    raise AssertionError("persistence retry loop exited unexpectedly")
