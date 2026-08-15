from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from typing import Any, cast

import pytest

from app.contexts.imaging.application import (
    ImageImportService,
    ImageUploadService,
    ImportConfiguration,
    UploadConfiguration,
)
from app.contexts.imaging.application.dto import (
    AiTaskEvent,
    CompleteUpload,
    ImportItem,
    MultipartPart,
    ObjectWriteResult,
    StoredObject,
)
from app.contexts.imaging.application.errors import RetryablePersistenceError
from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
    ImageImportAiStatus,
    ImageImportUploadStatus,
)


def _image() -> SimpleNamespace:
    return SimpleNamespace(
        id=12,
        file_uuid="file-12",
        original_filename="image.png",
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_bucket="images",
        object_key="file-12/original.png",
        storage_etag=None,
        file_size=7,
        file_hash=None,
        uploaded_by=3,
        status=ImageFileStatusEnum.UPLOADING,
        upload_progress=0,
        uploaded_at=None,
    )


class FakeStorage:
    def __init__(self) -> None:
        self.complete_calls = 0
        self.stat_calls = 0

    async def complete_multipart_upload(self, **_kwargs: Any) -> ObjectWriteResult:
        self.complete_calls += 1
        return ObjectWriteResult(etag="source-v1")

    async def stat_object(self, **_kwargs: Any) -> StoredObject:
        self.stat_calls += 1
        return StoredObject(size=7, etag="source-v1", metadata={})


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


class FakeUploadRepository:
    def __init__(self, image: SimpleNamespace, calls: list[str]) -> None:
        self.image = image
        self.calls = calls

    def get_active(self, image_file_id: int) -> SimpleNamespace | None:
        return self.image if image_file_id == self.image.id else None

    def commit(self) -> None:
        self.calls.append("commit")

    def rollback(self) -> None:
        self.calls.append("rollback")

    def refresh(self, _image: Any) -> None:
        return None


@pytest.mark.asyncio
async def test_single_upload_commits_pending_before_publishing_thumbnail() -> None:
    calls: list[str] = []
    image = _image()
    service = ImageUploadService(
        cast(Any, FakeUploadRepository(image, calls)),
        cast(Any, object()),
        cast(Any, FakeStorage()),
        cast(Any, FakeThumbnails(calls)),
        UploadConfiguration(bucket="images", part_size=5, expires_in=60),
    )

    await service.complete_session(
        image.id,
        CompleteUpload(
            upload_id="upload-1",
            parts=[MultipartPart(part_number=1, etag="part")],
            file_hash=None,
        ),
        ImageAccessActor(user_id=3),
    )

    assert calls == [
        "rollback",
        "prepare-thumbnail",
        "commit",
        "publish-thumbnail",
    ]
    assert image.storage_etag == "source-v1"


@pytest.mark.asyncio
async def test_single_upload_retries_database_without_recompleting_storage() -> None:
    calls: list[str] = []
    image = _image()
    storage = FakeStorage()
    thumbnails = FakeThumbnails(calls, prepare_failures=1)
    service = ImageUploadService(
        cast(Any, FakeUploadRepository(image, calls)),
        cast(Any, object()),
        cast(Any, storage),
        cast(Any, thumbnails),
        UploadConfiguration(bucket="images", part_size=5, expires_in=60),
    )

    result = await service.complete_session(
        image.id,
        CompleteUpload(
            upload_id="upload-1",
            parts=[MultipartPart(part_number=1, etag="part")],
            file_hash=None,
        ),
        ImageAccessActor(user_id=3),
    )

    assert result.status == ImageFileStatusEnum.UPLOADED.value
    assert storage.complete_calls == 1
    assert storage.stat_calls == 1
    assert calls == [
        "rollback",
        "prepare-thumbnail",
        "rollback",
        "prepare-thumbnail",
        "commit",
        "publish-thumbnail",
    ]


class FakeAiPublisher:
    def __init__(self, calls: list[str]) -> None:
        self.calls = calls

    async def publish(self, _event: AiTaskEvent) -> None:
        self.calls.append("publish-ai")


class FakeImportRepository:
    def __init__(
        self,
        image: SimpleNamespace,
        batch: SimpleNamespace,
        item: SimpleNamespace,
        calls: list[str],
    ) -> None:
        self.image = image
        self.batch = batch
        self.item = item
        self.calls = calls

    def get_owned_batch(self, *_args: Any) -> SimpleNamespace:
        return self.batch

    def get_owned_item(self, *_args: Any) -> SimpleNamespace:
        return self.item

    def get_active_image(self, *_args: Any) -> SimpleNamespace:
        return self.image

    def ensure_ai_task(self, *_args: Any, **_kwargs: Any) -> SimpleNamespace:
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
            image_file_id=12,
            upload_status=item.upload_status,
            ai_status=item.ai_status,
            error=item.error_message,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )


@pytest.mark.asyncio
async def test_batch_import_publishes_thumbnail_after_content_commit() -> None:
    calls: list[str] = []
    image = _image()
    batch = SimpleNamespace(id=1, batch_id="batch-1", uploaded_by=3)
    item = SimpleNamespace(
        id=5,
        image_file_id=12,
        upload_id="upload-1",
        upload_status=ImageImportUploadStatus.SESSION_CREATED.value,
        ai_status=ImageImportAiStatus.PENDING.value,
        error_message=None,
        created_at=datetime(2026, 8, 15),
        updated_at=datetime(2026, 8, 15),
    )
    service = ImageImportService(
        cast(Any, FakeImportRepository(image, batch, item, calls)),
        cast(Any, object()),
        cast(Any, FakeStorage()),
        cast(Any, FakeAiPublisher(calls)),
        cast(Any, FakeThumbnails(calls)),
        ImportConfiguration(
            max_files=200,
            session_window_size=10,
            bucket="images",
            part_size=5,
            expires_in=60,
        ),
    )

    await service.complete_item(
        "batch-1",
        5,
        CompleteUpload(
            upload_id="upload-1",
            parts=[MultipartPart(part_number=1, etag="part")],
            file_hash=None,
        ),
        ImageAccessActor(user_id=3),
    )

    assert calls == [
        "rollback",
        "prepare-thumbnail",
        "commit",
        "publish-thumbnail",
        "publish-ai",
    ]


@pytest.mark.asyncio
async def test_batch_import_retries_database_without_recompleting_storage() -> None:
    calls: list[str] = []
    image = _image()
    batch = SimpleNamespace(id=1, batch_id="batch-1", uploaded_by=3)
    item = SimpleNamespace(
        id=5,
        image_file_id=12,
        upload_id="upload-1",
        upload_status=ImageImportUploadStatus.SESSION_CREATED.value,
        ai_status=ImageImportAiStatus.PENDING.value,
        error_message=None,
        created_at=datetime(2026, 8, 15),
        updated_at=datetime(2026, 8, 15),
    )
    storage = FakeStorage()
    service = ImageImportService(
        cast(Any, FakeImportRepository(image, batch, item, calls)),
        cast(Any, object()),
        cast(Any, storage),
        cast(Any, FakeAiPublisher(calls)),
        cast(Any, FakeThumbnails(calls, prepare_failures=1)),
        ImportConfiguration(
            max_files=200,
            session_window_size=10,
            bucket="images",
            part_size=5,
            expires_in=60,
        ),
    )

    await service.complete_item(
        "batch-1",
        5,
        CompleteUpload(
            upload_id="upload-1",
            parts=[MultipartPart(part_number=1, etag="part")],
            file_hash=None,
        ),
        ImageAccessActor(user_id=3),
    )

    assert storage.complete_calls == 1
    assert storage.stat_calls == 1
    assert calls == [
        "rollback",
        "prepare-thumbnail",
        "rollback",
        "prepare-thumbnail",
        "commit",
        "publish-thumbnail",
        "publish-ai",
    ]
