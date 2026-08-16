from __future__ import annotations

from dataclasses import asdict
from datetime import datetime, timedelta
from types import SimpleNamespace
from typing import Any, cast

import pytest

from app.contexts.imaging.application import (
    ImageImportService,
    ImageUploadSessionService,
    ImportConfiguration,
    UploadSessionConfiguration,
)
from app.contexts.imaging.application.dto import (
    AiTaskEvent,
    CompleteUpload,
    ImportItem,
    MultipartPart,
    MultipartUpload,
    ObjectWriteResult,
    PresignedPart,
    StoredObject,
    UploadFileSpec,
)
from app.contexts.imaging.application.errors import (
    InvalidImageOperationError,
    ObjectStorageObjectNotFoundError,
    RetryablePersistenceError,
)
from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageFileTypeEnum,
    ImageImportAiStatus,
    ImageImportUploadStatus,
    ImageUploadSessionStatus,
    ImageUploadSourceType,
)


def _upload_session() -> SimpleNamespace:
    return SimpleNamespace(
        id=1,
        session_id="session-1",
        source_type=ImageUploadSourceType.SINGLE.value,
        batch_item_id=None,
        image_file_id=None,
        status=ImageUploadSessionStatus.READY.value,
        file_uuid="file-12",
        original_filename="image.png",
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        expected_size=7,
        expected_hash=None,
        storage_bucket="images",
        object_key="file-12/original.png",
        upload_id="upload-1",
        storage_etag=None,
        uploaded_by=3,
        patient_id=None,
        description=None,
        team_ids=[],
        expires_at=datetime(2026, 8, 15, 1),
        completion_lease_expires_at=None,
        last_error=None,
        created_at=datetime(2026, 8, 15),
        updated_at=datetime(2026, 8, 15),
        completed_at=None,
    )


class FakeStorage:
    def __init__(self, *, object_exists: bool) -> None:
        self.object_exists = object_exists
        self.complete_calls = 0
        self.stat_calls = 0

    async def stat_object(self, **_kwargs: Any) -> StoredObject:
        self.stat_calls += 1
        if not self.object_exists:
            raise ObjectStorageObjectNotFoundError("missing")
        return StoredObject(size=7, etag="source-v1", metadata={})

    async def complete_multipart_upload(self, **_kwargs: Any) -> ObjectWriteResult:
        self.complete_calls += 1
        self.object_exists = True
        return ObjectWriteResult(etag="source-v1")


class FakeThumbnails:
    def __init__(self, calls: list[str], *, prepare_failures: int = 0) -> None:
        self.calls = calls
        self.event = object()
        self.prepare_failures = prepare_failures

    def prepare(self, _image: Any) -> object:
        self.calls.append("prepare-thumbnail")
        if self.prepare_failures:
            self.prepare_failures -= 1
            raise RetryablePersistenceError("deadlock")
        return self.event

    async def publish_after_commit(self, event: object) -> bool:
        assert event is self.event
        self.calls.append("publish-thumbnail")
        return True


class FakeVisibility:
    def replace_team_visibility(self, _image: Any, _team_ids: list[int]) -> None:
        return None


class FakeUploadSessionRepository:
    def __init__(self, session: SimpleNamespace, calls: list[str]) -> None:
        self.session = session
        self.calls = calls
        self.pending_image: SimpleNamespace | None = None
        self.image_sequence = 12
        self.current_time = datetime(2026, 8, 15, 2)

    def get_owned(self, session_id: str, owner_id: int, **_kwargs: Any) -> Any:
        if (
            session_id == self.session.session_id
            and owner_id == self.session.uploaded_by
        ):
            return self.session
        return None

    def get_by_id(self, session_id: str, **_kwargs: Any) -> Any:
        return self.session if session_id == self.session.session_id else None

    def create_image(self, draft: Any) -> SimpleNamespace:
        image = SimpleNamespace(
            id=self.image_sequence,
            **asdict(draft),
            storage_etag=None,
            uploaded_at=None,
        )
        self.image_sequence += 1
        self.pending_image = image
        return image

    def attach_completed_batch_item(self, _session: Any, _image: Any) -> None:
        return None

    def commit(self) -> None:
        self.calls.append("commit")
        self.pending_image = None

    def rollback(self) -> None:
        self.calls.append("rollback")
        self.pending_image = None

    def refresh(self, _session: Any) -> None:
        return None

    def now(self) -> datetime:
        self.current_time += timedelta(seconds=1)
        return self.current_time


class FakeCreateSessionRepository:
    def __init__(self) -> None:
        self.session: SimpleNamespace | None = None
        self.commit_calls = 0
        self.rollback_calls = 0

    def patient_exists(self, _patient_id: int) -> bool:
        return True

    def create_replacing_active(self, draft: Any) -> tuple[Any, list[Any]]:
        self.session = SimpleNamespace(
            id=1,
            **asdict(draft),
            image_file_id=None,
            status=ImageUploadSessionStatus.INITIALIZING.value,
            upload_id=None,
            storage_etag=None,
            expires_at=None,
            completion_lease_expires_at=None,
            last_error=None,
            completed_at=None,
        )
        return self.session, []

    def get_owned(self, session_id: str, owner_id: int, **_kwargs: Any) -> Any:
        if (
            self.session is not None
            and self.session.session_id == session_id
            and self.session.uploaded_by == owner_id
        ):
            return self.session
        return None

    def commit(self) -> None:
        self.commit_calls += 1

    def rollback(self) -> None:
        self.rollback_calls += 1

    @staticmethod
    def now() -> datetime:
        return datetime(2026, 8, 15, 2)


class CancellingCreateStorage:
    def __init__(self, repository: FakeCreateSessionRepository) -> None:
        self.repository = repository
        self.abort_calls = 0

    async def ensure_bucket(self, _bucket: str) -> None:
        return None

    async def create_multipart_upload(self, **_kwargs: Any) -> MultipartUpload:
        assert self.repository.session is not None
        # Simulate a newer request cancelling this session while MinIO is creating
        # its multipart upload outside the database transaction.
        self.repository.session.status = ImageUploadSessionStatus.CANCELLED.value
        return MultipartUpload(
            upload_id="superseded-upload",
            parts=[PresignedPart(part_number=1, url="https://upload.test/part/1")],
        )

    async def abort_multipart_upload(self, **_kwargs: Any) -> None:
        self.abort_calls += 1


def _session_service(
    repository: FakeUploadSessionRepository,
    storage: FakeStorage,
    thumbnails: FakeThumbnails,
) -> ImageUploadSessionService:
    return ImageUploadSessionService(
        cast(Any, repository),
        cast(Any, FakeVisibility()),
        cast(Any, storage),
        cast(Any, thumbnails),
        UploadSessionConfiguration(
            bucket="images",
            part_size=5,
            expires_in=60,
            completion_lease_seconds=60,
        ),
    )


@pytest.mark.asyncio
async def test_create_aborts_multipart_when_batch_session_is_superseded() -> None:
    repository = FakeCreateSessionRepository()
    storage = CancellingCreateStorage(repository)
    service = ImageUploadSessionService(
        cast(Any, repository),
        cast(Any, FakeVisibility()),
        cast(Any, storage),
        cast(Any, SimpleNamespace()),
        UploadSessionConfiguration(
            bucket="images",
            part_size=5,
            expires_in=60,
            completion_lease_seconds=60,
        ),
    )

    with pytest.raises(InvalidImageOperationError, match="已被新的请求替代"):
        await service.create(
            UploadFileSpec(
                filename="image.png",
                size=7,
                mime_type="image/png",
                patient_id=None,
                description=None,
                team_ids=[],
                file_hash=None,
            ),
            ImageAccessActor(user_id=3),
            source_type=ImageUploadSourceType.BATCH_IMPORT,
            batch_item_id=9,
            validated_team_ids=[],
        )

    assert repository.session is not None
    assert repository.session.status == ImageUploadSessionStatus.CANCELLED.value
    assert storage.abort_calls == 1


@pytest.mark.asyncio
async def test_single_upload_stats_existing_object_before_database_finalize() -> None:
    calls: list[str] = []
    session = _upload_session()
    repository = FakeUploadSessionRepository(session, calls)
    storage = FakeStorage(object_exists=True)

    result = await _session_service(
        repository,
        storage,
        FakeThumbnails(calls),
    ).complete(
        "session-1",
        CompleteUpload(
            parts=[MultipartPart(part_number=1, etag="part")],
            file_hash=None,
        ),
        ImageAccessActor(user_id=3),
    )

    assert result.status == ImageUploadSessionStatus.COMPLETED.value
    assert result.image_file_id == 12
    assert storage.complete_calls == 0
    assert calls[-3:] == ["prepare-thumbnail", "commit", "publish-thumbnail"]


@pytest.mark.asyncio
async def test_completed_session_returns_original_image_without_storage_call() -> None:
    calls: list[str] = []
    session = _upload_session()
    session.status = ImageUploadSessionStatus.COMPLETED.value
    session.image_file_id = 12
    repository = FakeUploadSessionRepository(session, calls)
    storage = FakeStorage(object_exists=True)

    result = await _session_service(
        repository,
        storage,
        FakeThumbnails(calls),
    ).complete(
        "session-1",
        CompleteUpload(parts=[], file_hash=None),
        ImageAccessActor(user_id=3),
    )

    assert result.image_file_id == 12
    assert storage.stat_calls == 0
    assert storage.complete_calls == 0


@pytest.mark.asyncio
async def test_failure_report_cannot_overwrite_completing_session() -> None:
    calls: list[str] = []
    session = _upload_session()
    session.status = ImageUploadSessionStatus.COMPLETING.value
    session.completion_lease_expires_at = datetime(2026, 8, 15, 3)
    repository = FakeUploadSessionRepository(session, calls)

    with pytest.raises(InvalidImageOperationError, match="正在确认"):
        await _session_service(
            repository,
            FakeStorage(object_exists=True),
            FakeThumbnails(calls),
        ).fail(
            "session-1",
            "browser reported a failure",
            ImageAccessActor(user_id=3),
        )

    assert session.status == ImageUploadSessionStatus.COMPLETING.value


@pytest.mark.asyncio
async def test_active_completion_lease_rejects_concurrent_confirmation() -> None:
    calls: list[str] = []
    session = _upload_session()
    session.status = ImageUploadSessionStatus.COMPLETING.value
    session.completion_lease_expires_at = datetime(2026, 8, 15, 3)
    repository = FakeUploadSessionRepository(session, calls)

    with pytest.raises(InvalidImageOperationError) as exc_info:
        await _session_service(
            repository,
            FakeStorage(object_exists=True),
            FakeThumbnails(calls),
        ).complete(
            "session-1",
            CompleteUpload(parts=[], file_hash=None),
            ImageAccessActor(user_id=3),
        )

    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_recovery_does_not_recomplete_object_after_database_failure() -> None:
    calls: list[str] = []
    session = _upload_session()
    repository = FakeUploadSessionRepository(session, calls)
    storage = FakeStorage(object_exists=False)
    service = _session_service(
        repository,
        storage,
        FakeThumbnails(calls, prepare_failures=1),
    )

    with pytest.raises(RetryablePersistenceError):
        await service.complete(
            "session-1",
            CompleteUpload(
                parts=[MultipartPart(part_number=1, etag="part")],
                file_hash=None,
            ),
            ImageAccessActor(user_id=3),
        )

    result = await service.recover_existing("session-1")

    assert result.status == ImageUploadSessionStatus.COMPLETED.value
    assert storage.complete_calls == 1
    assert storage.stat_calls == 3
    assert calls[-3:] == ["prepare-thumbnail", "commit", "publish-thumbnail"]


class FakeAiPublisher:
    def __init__(self, calls: list[str]) -> None:
        self.calls = calls

    async def publish(self, _event: AiTaskEvent) -> None:
        self.calls.append("publish-ai")


class FakeImportSessionService:
    def __init__(self, calls: list[str], item: SimpleNamespace) -> None:
        self.calls = calls
        self.item = item

    async def complete(self, session_id: str, *_args: Any, **_kwargs: Any) -> None:
        assert session_id == "session-1"
        self.calls.append("complete-session")
        self.item.image_file_id = 12
        self.item.upload_status = ImageImportUploadStatus.UPLOADED.value


class FakeImportRepository:
    def __init__(
        self,
        batch: SimpleNamespace,
        item: SimpleNamespace,
        calls: list[str],
    ) -> None:
        self.batch = batch
        self.item = item
        self.calls = calls

    def get_owned_batch(self, *_args: Any) -> SimpleNamespace:
        return self.batch

    def get_owned_item(self, *_args: Any) -> SimpleNamespace:
        return self.item

    def ensure_ai_task(self, *_args: Any, **_kwargs: Any) -> SimpleNamespace:
        self.item.ai_status = ImageImportAiStatus.QUEUED.value
        return SimpleNamespace(task_id="ai-1", created_by=3)

    def refresh_batch_status(self, _batch: Any) -> None:
        return None

    def ai_task_event(self, *_args: Any) -> AiTaskEvent:
        return AiTaskEvent(
            event_type="image.ai.predict.requested",
            version=1,
            task_id="ai-1",
            batch_id="batch-1",
            batch_item_id=5,
            image_file_id=12,
            requested_by=3,
        )

    def commit(self) -> None:
        self.calls.append("commit")

    def rollback(self) -> None:
        self.calls.append("rollback")

    def refresh_item(self, _item: Any) -> None:
        return None

    def item_view(self, item: Any) -> ImportItem:
        return ImportItem(
            id=item.id,
            client_file_id="client-1",
            filename="image.png",
            size=7,
            mime_type="image/png",
            image_file_id=item.image_file_id,
            upload_status=item.upload_status,
            ai_status=item.ai_status,
            error=item.error_message,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )


@pytest.mark.asyncio
async def test_batch_import_schedules_ai_after_session_completion() -> None:
    calls: list[str] = []
    batch = SimpleNamespace(id=1, batch_id="batch-1", uploaded_by=3)
    item = SimpleNamespace(
        id=5,
        image_file_id=None,
        upload_status=ImageImportUploadStatus.SESSION_CREATED.value,
        ai_status=ImageImportAiStatus.PENDING.value,
        error_message=None,
        created_at=datetime(2026, 8, 15),
        updated_at=datetime(2026, 8, 15),
    )
    service = ImageImportService(
        cast(Any, FakeImportRepository(batch, item, calls)),
        cast(Any, object()),
        cast(Any, FakeAiPublisher(calls)),
        cast(Any, FakeImportSessionService(calls, item)),
        ImportConfiguration(max_files=200, session_window_size=10),
    )

    result = await service.complete_item(
        "batch-1",
        5,
        "session-1",
        CompleteUpload(
            parts=[MultipartPart(part_number=1, etag="part")],
            file_hash=None,
        ),
        ImageAccessActor(user_id=3),
    )

    assert result.item.image_file_id == 12
    assert calls == [
        "rollback",
        "complete-session",
        "commit",
        "publish-ai",
    ]
