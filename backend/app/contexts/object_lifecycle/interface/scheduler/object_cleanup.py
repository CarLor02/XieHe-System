"""Daily scheduler for expired soft-deleted storage objects."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from app.contexts.object_lifecycle.application import CleanupExpiredObjectsService
from app.contexts.object_lifecycle.infrastructure.persistence import (
    SqlAlchemyObjectCleanupRepository,
)
from app.contexts.object_lifecycle.infrastructure.storage import (
    StorageServiceObjectDeletionGateway,
)
from app.core.system.logger import LogLevel, logger
from app.shared.database import SessionLocal
from app.shared.redis import RedisDistributedLock, RedisStateUnavailable

OBJECT_CLEANUP_LEADER_LOCK_KEY = "locks:medical_backend:object_cleanup"
OBJECT_CLEANUP_LEADER_LOCK_TTL_SECONDS = 90
OBJECT_CLEANUP_LEADER_REFRESH_INTERVAL_SECONDS = 30
OBJECT_CLEANUP_LEADER_RETRY_SECONDS = 5
_object_cleanup_leader_refresh_task: asyncio.Task[None] | None = None
_object_cleanup_scheduler_task: asyncio.Task[None] | None = None
_object_cleanup_stopping = False
_object_cleanup_lock = RedisDistributedLock(
    OBJECT_CLEANUP_LEADER_LOCK_KEY,
    ttl_seconds=OBJECT_CLEANUP_LEADER_LOCK_TTL_SECONDS,
)


def _seconds_until_next_midnight() -> float:
    now = datetime.now()
    tomorrow = (now + timedelta(days=1)).date()
    next_midnight = datetime.combine(tomorrow, datetime.min.time())
    return max((next_midnight - now).total_seconds(), 1.0)


async def cleanup_soft_deleted_objects() -> None:
    """Run one cleanup cycle using context-owned adapters."""

    db = SessionLocal()
    try:
        service = CleanupExpiredObjectsService(
            SqlAlchemyObjectCleanupRepository(db),
            StorageServiceObjectDeletionGateway(),
        )
        result = await service.run(now=datetime.now())
        for failure in result.failures:
            candidate = failure.candidate
            logger.emit_event(
                LogLevel.WARNING,
                message=(
                    "物理删除对象失败，将下次重试: "
                    f"{candidate.bucket}/{candidate.object_key}: {failure.message}"
                ),
            )
        if result.deleted_count:
            logger.emit_event(
                LogLevel.INFO,
                message=f"对象存储清理完成: 已删除 {result.deleted_count} 个对象",
            )
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"对象存储清理任务失败: {exc}")
    finally:
        db.close()


async def _try_acquire_object_cleanup_leader() -> bool:
    """Acquire the cross-worker object cleanup leader lock in Redis."""
    try:
        return await _object_cleanup_lock.acquire()
    except RedisStateUnavailable as exc:
        logger.emit_event(LogLevel.ERROR, message=f"获取对象清理 leader 锁失败: {exc}")
        return False


async def _release_object_cleanup_leader() -> None:
    """Release the object cleanup leader lock only when this process still owns it."""
    try:
        await _object_cleanup_lock.release()
    except RedisStateUnavailable as exc:
        logger.emit_event(LogLevel.ERROR, message=f"释放对象清理 leader 锁失败: {exc}")


async def _refresh_object_cleanup_leader() -> None:
    """Keep the leader lock alive while this worker owns the scheduler."""
    while True:
        await asyncio.sleep(OBJECT_CLEANUP_LEADER_REFRESH_INTERVAL_SECONDS)
        try:
            if not await _object_cleanup_lock.renew():
                logger.emit_event(
                    LogLevel.WARNING,
                    message="对象清理 leader 锁已丢失，停止当前 worker 的清理任务",
                )
                if (
                    _object_cleanup_scheduler_task is not None
                    and not _object_cleanup_scheduler_task.done()
                ):
                    _object_cleanup_scheduler_task.cancel()
                return
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.emit_event(
                LogLevel.ERROR, message=f"刷新对象清理 leader 锁失败: {exc}"
            )


def _start_object_cleanup_leader_refresh() -> None:
    """Start the local leader-lock refresh task."""
    global _object_cleanup_leader_refresh_task
    if (
        _object_cleanup_leader_refresh_task is None
        or _object_cleanup_leader_refresh_task.done()
    ):
        _object_cleanup_leader_refresh_task = asyncio.create_task(
            _refresh_object_cleanup_leader()
        )


async def _stop_object_cleanup_leader_refresh() -> None:
    """Stop the local leader-lock refresh task."""
    global _object_cleanup_leader_refresh_task
    if _object_cleanup_leader_refresh_task is None:
        return
    task = _object_cleanup_leader_refresh_task
    _object_cleanup_leader_refresh_task = None
    if not task.done():
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


async def start_object_cleanup_scheduler() -> None:
    """Run cleanup every day at local midnight."""
    global _object_cleanup_scheduler_task, _object_cleanup_stopping
    _object_cleanup_stopping = False
    _object_cleanup_scheduler_task = asyncio.current_task()
    try:
        while not _object_cleanup_stopping:
            if not await _try_acquire_object_cleanup_leader():
                await asyncio.sleep(OBJECT_CLEANUP_LEADER_RETRY_SECONDS)
                continue

            _start_object_cleanup_leader_refresh()
            try:
                while not _object_cleanup_stopping:
                    await asyncio.sleep(_seconds_until_next_midnight())
                    await cleanup_soft_deleted_objects()
            finally:
                await _stop_object_cleanup_leader_refresh()
                await _release_object_cleanup_leader()
    finally:
        if _object_cleanup_scheduler_task is asyncio.current_task():
            _object_cleanup_scheduler_task = None


async def stop_object_cleanup_scheduler() -> None:
    """Stop this worker's scheduler and release its lease."""
    global _object_cleanup_stopping
    _object_cleanup_stopping = True
    task = _object_cleanup_scheduler_task
    if task is not None and not task.done():
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
