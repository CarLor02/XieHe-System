"""SQLAlchemy adapters for thumbnail scheduling, execution and querying."""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timedelta
from typing import cast

from sqlalchemy import and_, func, or_
from sqlalchemy.dialects.mysql import insert as mysql_insert
from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import (
    ThumbnailGenerationResult,
    ThumbnailGenerationSource,
    ThumbnailTaskEvent,
)
from app.contexts.imaging.application.ports import (
    ImageFileDerivativeRecord,
    ImageFileRecord,
)
from app.contexts.imaging.domain import (
    ImageDerivativeStatus,
    ImageDerivativeVariant,
    ImageFileStatusEnum,
    is_current_card_thumbnail_object_key,
    normalize_storage_etag,
)
from app.shared.database import SessionLocal

from .image_file_models import ImageFile, ImageFileDerivative
from .mysql_lock_errors import (
    commit_with_lock_translation,
    translate_mysql_lock_errors,
)


def _task_event(derivative: ImageFileDerivative) -> ThumbnailTaskEvent:
    return ThumbnailTaskEvent(
        event_type="image.thumbnail.generate.requested",
        version=1,
        derivative_id=derivative.id,
        image_file_id=derivative.image_file_id,
        source_storage_etag=derivative.source_storage_etag,
    )


class SqlAlchemyThumbnailSchedulingRepository:
    """Session-bound adapter so PENDING and image content commit atomically."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def list_backfill_images(
        self,
        *,
        after_id: int,
        limit: int,
    ) -> list[ImageFileRecord]:
        images = (
            self._session.query(ImageFile)
            .filter(
                ImageFile.id > after_id,
                ImageFile.is_deleted.is_(False),
                ImageFile.status.in_(
                    [ImageFileStatusEnum.UPLOADED, ImageFileStatusEnum.PROCESSED]
                ),
            )
            .order_by(ImageFile.id.asc())
            .limit(max(1, limit))
            .all()
        )
        return cast(list[ImageFileRecord], images)

    def has_ready_for_current_source(self, image: ImageFileRecord) -> bool:
        source_etag = normalize_storage_etag(image.storage_etag)
        derivative = (
            self._session.query(ImageFileDerivative)
            .filter(
                ImageFileDerivative.image_file_id == image.id,
                ImageFileDerivative.variant
                == ImageDerivativeVariant.CARD_THUMBNAIL.value,
                ImageFileDerivative.status == ImageDerivativeStatus.READY.value,
            )
            .first()
        )
        return bool(
            derivative
            and derivative.object_key
            and source_etag is not None
            and normalize_storage_etag(derivative.source_storage_etag) == source_etag
            and is_current_card_thumbnail_object_key(
                file_uuid=str(image.file_uuid),
                source_etag=source_etag,
                object_key=derivative.object_key,
            )
        )

    def upsert_pending(
        self, image: ImageFileRecord
    ) -> ImageFileDerivativeRecord | None:
        source_etag = normalize_storage_etag(image.storage_etag)
        with translate_mysql_lock_errors():
            insert_statement = mysql_insert(ImageFileDerivative).values(
                image_file_id=image.id,
                variant=ImageDerivativeVariant.CARD_THUMBNAIL.value,
                source_storage_etag=source_etag,
                storage_bucket=str(image.storage_bucket),
                status=ImageDerivativeStatus.PENDING.value,
                retry_count=0,
            )
            # 缺失记录上先 SELECT FOR UPDATE 会在 InnoDB REPEATABLE READ 下
            # 获取 gap lock，并发上传随后插入不同影像时也可能彼此死锁。
            # 原子 upsert 直接由唯一键串行化同一派生对象，避免预锁空区间。
            insert_statement = insert_statement.on_duplicate_key_update(
                id=func.last_insert_id(ImageFileDerivative.id)
            )
            result = self._session.execute(insert_statement)
            derivative_id = int(result.lastrowid or 0)
            query = self._session.query(ImageFileDerivative).populate_existing()
            if derivative_id:
                derivative = query.filter(ImageFileDerivative.id == derivative_id).one()
            else:
                derivative = query.filter(
                    ImageFileDerivative.image_file_id == image.id,
                    ImageFileDerivative.variant
                    == ImageDerivativeVariant.CARD_THUMBNAIL.value,
                ).one()

            same_source = (
                normalize_storage_etag(derivative.source_storage_etag) == source_etag
            )
            current_render = same_source and is_current_card_thumbnail_object_key(
                file_uuid=str(image.file_uuid),
                source_etag=source_etag,
                object_key=derivative.object_key,
            )
            if (
                current_render
                and derivative.status == ImageDerivativeStatus.READY.value
                and derivative.object_key
            ):
                return None

            if not same_source or not current_render:
                # Keep the previous object reference until the worker deletes it. This avoids
                # losing the only cleanup pointer when source or renderer versions advance.
                derivative.source_storage_etag = source_etag
                derivative.retry_count = 0
            derivative.status = ImageDerivativeStatus.PENDING.value
            derivative.last_error = None
            derivative.next_retry_at = None
            derivative.lease_expires_at = None
            derivative.updated_at = datetime.now()
            self._session.flush()
        return cast(ImageFileDerivativeRecord, derivative)

    def commit(self) -> None:
        commit_with_lock_translation(self._session)

    def rollback(self) -> None:
        self._session.rollback()


class SqlAlchemyThumbnailQueryRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_card_thumbnails(
        self, image_file_ids: list[int]
    ) -> dict[int, ImageFileDerivativeRecord]:
        derivatives = (
            self._session.query(ImageFileDerivative)
            .filter(
                ImageFileDerivative.image_file_id.in_(image_file_ids),
                ImageFileDerivative.variant
                == ImageDerivativeVariant.CARD_THUMBNAIL.value,
            )
            .all()
        )
        return {
            derivative.image_file_id: cast(ImageFileDerivativeRecord, derivative)
            for derivative in derivatives
        }


class SqlAlchemyThumbnailTaskRepository:
    """Short-lived sessions isolate Worker claims from image API transactions."""

    def __init__(self, session_factory: Callable[[], Session] = SessionLocal) -> None:
        self._session_factory = session_factory

    def claim(
        self,
        event: ThumbnailTaskEvent,
        *,
        now: datetime,
        lease_seconds: int,
    ) -> ThumbnailGenerationSource | None:
        db = self._session_factory()
        try:
            derivative = self._get_locked(db, event)
            if derivative is None:
                db.rollback()
                return None
            image = (
                db.query(ImageFile)
                .filter(
                    ImageFile.id == event.image_file_id,
                    ImageFile.is_deleted.is_(False),
                )
                .with_for_update()
                .first()
            )
            if image is None or not self._event_matches(derivative, event):
                db.rollback()
                return None
            if derivative.status == ImageDerivativeStatus.READY.value:
                db.rollback()
                return None
            if (
                derivative.status == ImageDerivativeStatus.PROCESSING.value
                and derivative.lease_expires_at is not None
                and derivative.lease_expires_at > now
            ):
                db.rollback()
                return None
            derivative.status = ImageDerivativeStatus.PROCESSING.value
            derivative.lease_expires_at = now + timedelta(seconds=lease_seconds)
            derivative.next_retry_at = None
            derivative.updated_at = now
            source = ThumbnailGenerationSource(
                derivative_id=derivative.id,
                image_file_id=image.id,
                file_uuid=str(image.file_uuid),
                file_type=image.file_type,
                source_bucket=str(image.storage_bucket),
                source_object_key=str(image.object_key),
                expected_source_etag=derivative.source_storage_etag,
                previous_thumbnail_bucket=derivative.storage_bucket,
                previous_thumbnail_object_key=derivative.object_key,
            )
            db.commit()
            return source
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def mark_ready(
        self,
        event: ThumbnailTaskEvent,
        result: ThumbnailGenerationResult,
    ) -> bool:
        db = self._session_factory()
        try:
            derivative = self._get_locked(db, event)
            image = (
                db.query(ImageFile)
                .filter(
                    ImageFile.id == event.image_file_id,
                    ImageFile.is_deleted.is_(False),
                )
                .with_for_update()
                .first()
            )
            if (
                derivative is None
                or image is None
                or not self._event_matches(derivative, event)
            ):
                db.rollback()
                return False
            result_source_etag = normalize_storage_etag(result.source_storage_etag)
            image_source_etag = normalize_storage_etag(image.storage_etag)
            derivative_source_etag = normalize_storage_etag(
                derivative.source_storage_etag
            )
            if (
                result_source_etag is None
                or (image_source_etag and image_source_etag != result_source_etag)
                or (
                    derivative_source_etag
                    and derivative_source_etag != result_source_etag
                )
            ):
                db.rollback()
                return False

            # Historical rows can lack ETag; only a successful storage stat may fill it.
            if image_source_etag is None:
                image.storage_etag = result_source_etag
            derivative.source_storage_etag = result_source_etag
            derivative.storage_bucket = result.storage_bucket
            derivative.object_key = result.object_key
            derivative.storage_etag = normalize_storage_etag(result.storage_etag)
            derivative.mime_type = result.mime_type
            derivative.width = result.width
            derivative.height = result.height
            derivative.file_size = result.file_size
            derivative.status = ImageDerivativeStatus.READY.value
            derivative.retry_count = 0
            derivative.last_error = None
            derivative.next_retry_at = None
            derivative.lease_expires_at = None
            derivative.updated_at = datetime.now()
            db.commit()
            return True
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def mark_failed(
        self,
        event: ThumbnailTaskEvent,
        *,
        error: str,
        transient: bool,
        max_retries: int,
        now: datetime,
    ) -> None:
        db = self._session_factory()
        try:
            derivative = self._get_locked(db, event)
            if derivative is None or not self._event_matches(derivative, event):
                db.rollback()
                return
            derivative.retry_count = int(derivative.retry_count or 0) + 1
            derivative.status = ImageDerivativeStatus.FAILED.value
            derivative.last_error = error[:4000]
            derivative.lease_expires_at = None
            if transient and derivative.retry_count < max_retries:
                delay = min(2 ** (derivative.retry_count - 1), 300)
                derivative.next_retry_at = now + timedelta(seconds=delay)
            else:
                derivative.next_retry_at = None
            derivative.updated_at = now
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def list_requeue_candidates(
        self,
        *,
        now: datetime,
        pending_before: datetime,
        limit: int,
    ) -> list[ThumbnailTaskEvent]:
        db = self._session_factory()
        try:
            derivatives = (
                db.query(ImageFileDerivative)
                .join(ImageFile, ImageFile.id == ImageFileDerivative.image_file_id)
                .filter(
                    ImageFile.is_deleted.is_(False),
                    ImageFileDerivative.variant
                    == ImageDerivativeVariant.CARD_THUMBNAIL.value,
                    or_(
                        and_(
                            ImageFileDerivative.status
                            == ImageDerivativeStatus.PENDING.value,
                            ImageFileDerivative.updated_at <= pending_before,
                        ),
                        and_(
                            ImageFileDerivative.status
                            == ImageDerivativeStatus.PROCESSING.value,
                            ImageFileDerivative.lease_expires_at.isnot(None),
                            ImageFileDerivative.lease_expires_at <= now,
                        ),
                        and_(
                            ImageFileDerivative.status
                            == ImageDerivativeStatus.FAILED.value,
                            ImageFileDerivative.next_retry_at.isnot(None),
                            ImageFileDerivative.next_retry_at <= now,
                        ),
                    ),
                )
                .order_by(ImageFileDerivative.id.asc())
                .limit(max(1, limit))
                .all()
            )
            return [_task_event(item) for item in derivatives]
        finally:
            db.close()

    @staticmethod
    def _get_locked(
        db: Session, event: ThumbnailTaskEvent
    ) -> ImageFileDerivative | None:
        return (
            db.query(ImageFileDerivative)
            .filter(
                ImageFileDerivative.id == event.derivative_id,
                ImageFileDerivative.image_file_id == event.image_file_id,
                ImageFileDerivative.variant
                == ImageDerivativeVariant.CARD_THUMBNAIL.value,
            )
            .with_for_update()
            .first()
        )

    @staticmethod
    def _event_matches(
        derivative: ImageFileDerivative, event: ThumbnailTaskEvent
    ) -> bool:
        return normalize_storage_etag(
            derivative.source_storage_etag
        ) == normalize_storage_etag(event.source_storage_etag)
