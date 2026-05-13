"""Scheduled cleanup for soft-deleted object-storage files."""

from __future__ import annotations

import asyncio
import os
import socket
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import uuid4

from app.core.database.session import SessionLocal
from app.core.system.cache import get_cache_manager
from app.core.system.logger import LogLevel, logger
from app.models.image_file import ImageFile
from app.models.user import User
from app.services.storage_gateway import StorageServiceError, storage_gateway


OBJECT_CLEANUP_LEADER_LOCK_KEY = "locks:medical_backend:object_cleanup"
OBJECT_CLEANUP_LEADER_LOCK_TTL_SECONDS = 90
OBJECT_CLEANUP_LEADER_REFRESH_INTERVAL_SECONDS = 30
OBJECT_CLEANUP_LEADER_TOKEN = f"{socket.gethostname()}:{os.getpid()}:{uuid4().hex}"
_object_cleanup_leader_refresh_task: Optional[asyncio.Task] = None
_object_cleanup_scheduler_task: Optional[asyncio.Task] = None


def _seconds_until_next_midnight() -> float:
    now = datetime.now()
    tomorrow = (now + timedelta(days=1)).date()
    next_midnight = datetime.combine(tomorrow, datetime.min.time())
    return max((next_midnight - now).total_seconds(), 1.0)


async def cleanup_soft_deleted_objects() -> None:
    """Physically delete objects whose soft-delete marker is older than one month."""

    cutoff = datetime.now() - timedelta(days=30)
    db = SessionLocal()
    try:
        images = db.query(ImageFile).filter(
            ImageFile.is_deleted == True,
            ImageFile.deleted_at.isnot(None),
            ImageFile.deleted_at < cutoff,
        ).all()
        for image in images:
            if not image.storage_bucket or not image.object_key:
                continue
            try:
                await storage_gateway.delete_object(
                    bucket=image.storage_bucket,
                    object_key=image.object_key,
                )
                logger.emit_event(LogLevel.INFO, message=f"已物理删除影像对象: {image.storage_bucket}/{image.object_key}")
            except StorageServiceError as exc:
                logger.emit_event(LogLevel.WARNING, message=f"物理删除影像对象失败，将下次重试: {exc}")

        users = db.query(User).filter(
            User.avatar_deleted_at.isnot(None),
            User.avatar_deleted_at < cutoff,
            User.avatar_storage_bucket.isnot(None),
            User.avatar_object_key.isnot(None),
        ).all()
        for user in users:
            try:
                await storage_gateway.delete_object(
                    bucket=user.avatar_storage_bucket,
                    object_key=user.avatar_object_key,
                )
                user.avatar_storage_bucket = None
                user.avatar_object_key = None
                user.avatar_storage_etag = None
                user.avatar_deleted_at = None
                logger.emit_event(LogLevel.INFO, message=f"已物理删除用户头像对象: user={user.id}")
            except StorageServiceError as exc:
                logger.emit_event(LogLevel.WARNING, message=f"物理删除用户头像失败，将下次重试: {exc}")

        db.commit()
    except Exception as exc:
        db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"对象存储清理任务失败: {exc}")
    finally:
        db.close()


def _normalize_lock_value(value: Any) -> str:
    """Normalize Redis lock values returned as bytes or strings."""
    if isinstance(value, bytes):
        return value.decode()
    return str(value) if value is not None else ""


def _try_acquire_object_cleanup_leader() -> bool:
    """Acquire the cross-worker object cleanup leader lock in Redis."""
    try:
        redis_client = get_cache_manager().redis_client
        return bool(
            redis_client.set(
                OBJECT_CLEANUP_LEADER_LOCK_KEY,
                OBJECT_CLEANUP_LEADER_TOKEN,
                nx=True,
                ex=OBJECT_CLEANUP_LEADER_LOCK_TTL_SECONDS,
            )
        )
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"获取对象清理 leader 锁失败: {exc}")
        return False


def _release_object_cleanup_leader() -> None:
    """Release the object cleanup leader lock only when this process still owns it."""
    try:
        redis_client = get_cache_manager().redis_client
        if _normalize_lock_value(redis_client.get(OBJECT_CLEANUP_LEADER_LOCK_KEY)) == OBJECT_CLEANUP_LEADER_TOKEN:
            redis_client.delete(OBJECT_CLEANUP_LEADER_LOCK_KEY)
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"释放对象清理 leader 锁失败: {exc}")


async def _refresh_object_cleanup_leader() -> None:
    """Keep the object cleanup leader lock alive while this worker owns the scheduler."""
    while True:
        await asyncio.sleep(OBJECT_CLEANUP_LEADER_REFRESH_INTERVAL_SECONDS)
        try:
            redis_client = get_cache_manager().redis_client
            if _normalize_lock_value(redis_client.get(OBJECT_CLEANUP_LEADER_LOCK_KEY)) != OBJECT_CLEANUP_LEADER_TOKEN:
                logger.emit_event(LogLevel.WARNING, message="对象清理 leader 锁已丢失，停止当前 worker 的清理任务")
                if _object_cleanup_scheduler_task is not None and not _object_cleanup_scheduler_task.done():
                    _object_cleanup_scheduler_task.cancel()
                return
            redis_client.expire(OBJECT_CLEANUP_LEADER_LOCK_KEY, OBJECT_CLEANUP_LEADER_LOCK_TTL_SECONDS)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.emit_event(LogLevel.ERROR, message=f"刷新对象清理 leader 锁失败: {exc}")


def _start_object_cleanup_leader_refresh() -> None:
    """Start a local task that refreshes the Redis object cleanup leader lock."""
    global _object_cleanup_leader_refresh_task
    if _object_cleanup_leader_refresh_task is None or _object_cleanup_leader_refresh_task.done():
        _object_cleanup_leader_refresh_task = asyncio.create_task(_refresh_object_cleanup_leader())


async def _stop_object_cleanup_leader_refresh() -> None:
    """Stop the local object cleanup leader-lock refresh task."""
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

    global _object_cleanup_scheduler_task
    if not _try_acquire_object_cleanup_leader():
        logger.emit_event(LogLevel.INFO, message="对象存储清理任务已由其他 worker 运行，当前 worker 跳过启动")
        return

    _object_cleanup_scheduler_task = asyncio.current_task()
    _start_object_cleanup_leader_refresh()
    try:
        while True:
            await asyncio.sleep(_seconds_until_next_midnight())
            await cleanup_soft_deleted_objects()
    finally:
        await _stop_object_cleanup_leader_refresh()
        _release_object_cleanup_leader()
        if _object_cleanup_scheduler_task is asyncio.current_task():
            _object_cleanup_scheduler_task = None
