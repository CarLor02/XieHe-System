"""Reconcile durable upload sessions and legacy UPLOADING placeholders."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from app.contexts.imaging.domain import (
    ImageFileStatusEnum,
    ImageImportAiStatus,
    ImageImportUploadStatus,
    ImageUploadSessionStatus,
    normalize_storage_etag,
)

from .errors import (
    InvalidImageOperationError,
    ObjectStorageObjectNotFoundError,
    ObjectStorageUnavailableError,
)
from .ports import (
    AiTaskPublisher,
    ImageFileRecord,
    ImageImportItemRecord,
    ImageImportRepository,
    ImageUploadSessionRecord,
    ObjectStorage,
    UploadSessionRepository,
)
from .thumbnail_scheduling_service import ThumbnailSchedulingService
from .upload_session_service import ImageUploadSessionService


@dataclass(slots=True)
class UploadReconciliationResult:
    scanned: int = 0
    recovered: int = 0
    expired: int = 0
    aborted: int = 0
    skipped: int = 0
    failed: int = 0
    legacy: int = 0


class UploadReconciliationService:
    """Repair stale uploads without making incomplete objects user-visible."""

    def __init__(
        self,
        repository: UploadSessionRepository,
        imports: ImageImportRepository,
        sessions: ImageUploadSessionService,
        storage: ObjectStorage,
        thumbnails: ThumbnailSchedulingService,
        ai_publisher: AiTaskPublisher,
    ) -> None:
        self._repository = repository
        self._imports = imports
        self._sessions = sessions
        self._storage = storage
        self._thumbnails = thumbnails
        self._ai_publisher = ai_publisher

    async def run(
        self,
        *,
        dry_run: bool,
        stale_after_seconds: int,
        batch_size: int,
        from_id: int,
        limit: int | None,
    ) -> UploadReconciliationResult:
        result = UploadReconciliationResult()
        stale_before = self._repository.now() - timedelta(seconds=stale_after_seconds)
        remaining = limit
        session_cursor = from_id
        while remaining is None or remaining > 0:
            page_size = (
                min(batch_size, remaining) if remaining is not None else batch_size
            )
            sessions = self._repository.list_stale_sessions(
                from_id=session_cursor,
                stale_before=stale_before,
                limit=page_size,
            )
            if not sessions:
                break
            for session in sessions:
                await self._reconcile_session(session, dry_run, result)
            result.scanned += len(sessions)
            session_cursor = sessions[-1].id + 1
            if remaining is not None:
                remaining -= len(sessions)

        legacy_cursor = from_id
        while remaining is None or remaining > 0:
            page_size = (
                min(batch_size, remaining) if remaining is not None else batch_size
            )
            images = self._repository.list_stale_legacy_images(
                from_id=legacy_cursor,
                stale_before=stale_before,
                limit=page_size,
            )
            if not images:
                break
            for image in images:
                await self._reconcile_legacy_image(image, dry_run, result)
            result.scanned += len(images)
            result.legacy += len(images)
            legacy_cursor = images[-1].id + 1
            if remaining is not None:
                remaining -= len(images)
        return result

    async def _reconcile_session(
        self,
        session: ImageUploadSessionRecord,
        dry_run: bool,
        result: UploadReconciliationResult,
    ) -> None:
        try:
            stored = await self._storage.stat_object(
                bucket=session.storage_bucket,
                object_key=session.object_key,
            )
        except ObjectStorageObjectNotFoundError:
            await self._expire_missing_session(session, dry_run, result)
            return
        except ObjectStorageUnavailableError:
            self._repository.rollback()
            result.failed += 1
            return

        try:
            ImageUploadSessionService.validate_stored_object(session, stored, None)
        except InvalidImageOperationError as exc:
            self._fail_invalid_session(session, str(exc), dry_run, result)
            return

        if dry_run:
            result.recovered += 1
            return
        try:
            status = await self._sessions.recover_existing(session.session_id)
            if status.image_file_id is None:
                result.failed += 1
                return
            if session.batch_item_id is not None:
                published = await self._schedule_ai(session.batch_item_id)
                if not published:
                    result.failed += 1
                    return
            result.recovered += 1
        except ObjectStorageObjectNotFoundError:
            # The object may disappear between the initial stat and the shared
            # recovery use case's stat. Converge it like any other missing upload.
            await self._expire_missing_session(session, dry_run=False, result=result)
        except (InvalidImageOperationError, ObjectStorageUnavailableError):
            self._repository.rollback()
            result.failed += 1

    async def _reconcile_legacy_image(
        self,
        image: ImageFileRecord,
        dry_run: bool,
        result: UploadReconciliationResult,
    ) -> None:
        """Handle placeholders created before image_upload_sessions existed."""

        item = self._repository.get_batch_item_for_image(image.id)
        try:
            stored = await self._storage.stat_object(
                bucket=image.storage_bucket,
                object_key=image.object_key,
            )
        except ObjectStorageObjectNotFoundError:
            await self._expire_missing_legacy_image(image, item, dry_run, result)
            return
        except ObjectStorageUnavailableError:
            self._repository.rollback()
            result.failed += 1
            return

        if stored.size != image.file_size:
            result.failed += 1
            return
        if dry_run:
            result.recovered += 1
            return

        now = self._repository.now()
        image.storage_etag = normalize_storage_etag(stored.etag)
        image.status = ImageFileStatusEnum.UPLOADED
        image.upload_progress = 100
        image.uploaded_at = image.uploaded_at or now
        thumbnail_event = self._thumbnails.prepare(image)
        if item is not None:
            item.upload_status = ImageImportUploadStatus.UPLOADED.value
            item.error_message = None
            item.updated_at = now
            batch = self._imports.get_batch_by_id(item.batch_id)
            if batch is not None:
                self._imports.refresh_batch_status(batch)
        self._repository.commit()
        await self._thumbnails.publish_after_commit(thumbnail_event)
        if item is not None and not await self._schedule_ai(item.id):
            result.failed += 1
            return
        result.recovered += 1

    async def _expire_missing_session(
        self,
        session: ImageUploadSessionRecord,
        dry_run: bool,
        result: UploadReconciliationResult,
    ) -> None:
        if dry_run:
            result.expired += 1
            result.aborted += int(session.upload_id is not None)
            return
        try:
            if session.upload_id:
                await self._storage.abort_multipart_upload(
                    bucket=session.storage_bucket,
                    object_key=session.object_key,
                    upload_id=session.upload_id,
                )
                result.aborted += 1
        except ObjectStorageUnavailableError:
            self._repository.rollback()
            result.failed += 1
            return
        session.status = ImageUploadSessionStatus.EXPIRED.value
        session.last_error = "上传会话过期且对象不存在"
        session.completion_lease_expires_at = None
        self._mark_batch_item_failed(session.batch_item_id, session.last_error)
        self._repository.commit()
        result.expired += 1

    def _fail_invalid_session(
        self,
        session: ImageUploadSessionRecord,
        error: str,
        dry_run: bool,
        result: UploadReconciliationResult,
    ) -> None:
        if not dry_run:
            session.status = ImageUploadSessionStatus.FAILED.value
            session.last_error = error
            session.completion_lease_expires_at = None
            self._mark_batch_item_failed(session.batch_item_id, error)
            self._repository.commit()
        result.failed += 1

    async def _expire_missing_legacy_image(
        self,
        image: ImageFileRecord,
        item: ImageImportItemRecord | None,
        dry_run: bool,
        result: UploadReconciliationResult,
    ) -> None:
        if dry_run:
            result.expired += 1
            result.aborted += int(item is not None and item.upload_id is not None)
            return
        try:
            if item is not None and item.upload_id:
                await self._storage.abort_multipart_upload(
                    bucket=image.storage_bucket,
                    object_key=image.object_key,
                    upload_id=item.upload_id,
                )
                result.aborted += 1
        except ObjectStorageUnavailableError:
            self._repository.rollback()
            result.failed += 1
            return
        now = self._repository.now()
        image.status = ImageFileStatusEnum.DELETED
        image.is_deleted = True
        image.deleted_at = now
        image.upload_progress = 0
        self._mark_item_failed(item, "历史上传对象不存在")
        self._repository.commit()
        result.expired += 1

    def _mark_batch_item_failed(self, item_id: int | None, error: str) -> None:
        if item_id is None:
            return
        self._mark_item_failed(self._imports.get_item_by_id(item_id), error)

    def _mark_item_failed(self, item: ImageImportItemRecord | None, error: str) -> None:
        if item is None:
            return
        item.upload_status = ImageImportUploadStatus.FAILED.value
        item.ai_status = ImageImportAiStatus.FAILED.value
        item.error_message = error
        item.updated_at = self._repository.now()
        batch = self._imports.get_batch_by_id(item.batch_id)
        if batch is not None:
            self._imports.refresh_batch_status(batch)

    async def _schedule_ai(self, item_id: int) -> bool:
        item = self._imports.get_item_by_id(item_id)
        if item is None or item.image_file_id is None:
            return False
        batch = self._imports.get_batch_by_id(item.batch_id)
        if batch is None:
            return False
        task = self._imports.ensure_ai_task(item, batch.uploaded_by)
        self._imports.refresh_batch_status(batch)
        event = self._imports.ai_task_event(task, item, batch)
        self._imports.commit()
        try:
            await self._ai_publisher.publish(event)
        except Exception:  # noqa: BLE001 - reconciliation reports infrastructure failure.
            item = self._imports.get_item_by_id(item_id)
            if item is not None:
                item.ai_status = ImageImportAiStatus.PENDING.value
                item.error_message = "AI任务排队失败，可重新入队"
                batch = self._imports.get_batch_by_id(item.batch_id)
                if batch is not None:
                    self._imports.refresh_batch_status(batch)
                self._imports.commit()
            return False
        return True
