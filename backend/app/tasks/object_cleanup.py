"""Scheduled cleanup for soft-deleted object-storage files."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta

from app.core.database.session import SessionLocal
from app.core.system.logger import LogLevel, logger
from app.models.image_file import ImageFile
from app.models.user import User
from app.services.storage_gateway import StorageServiceError, storage_gateway



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


async def start_object_cleanup_scheduler() -> None:
    """Run cleanup every day at local midnight."""

    while True:
        await asyncio.sleep(_seconds_until_next_midnight())
        await cleanup_soft_deleted_objects()
