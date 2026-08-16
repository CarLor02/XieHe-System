from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace
from typing import Any, cast

import pytest

from app.contexts.imaging.application import UploadReconciliationService
from app.contexts.imaging.application.dto import StoredObject, UploadStatus
from app.contexts.imaging.application.errors import (
    ObjectStorageObjectNotFoundError,
    ObjectStorageUnavailableError,
)
from app.contexts.imaging.domain import (
    ImageFileStatusEnum,
    ImageUploadSessionStatus,
)


def _session() -> SimpleNamespace:
    return SimpleNamespace(
        id=1,
        session_id="session-1",
        status=ImageUploadSessionStatus.READY.value,
        storage_bucket="images",
        object_key="new/image.png",
        upload_id="upload-new",
        expected_size=7,
        expected_hash=None,
        batch_item_id=None,
        completion_lease_expires_at=None,
    )


def _legacy_image() -> SimpleNamespace:
    return SimpleNamespace(
        id=9,
        storage_bucket="images",
        object_key="legacy/image.png",
        storage_etag=None,
        file_size=7,
        status=ImageFileStatusEnum.UPLOADING,
        is_deleted=False,
        deleted_at=None,
        upload_progress=0,
        uploaded_at=None,
    )


class FakeRepository:
    def __init__(
        self,
        sessions: list[SimpleNamespace],
        legacy_images: list[SimpleNamespace],
        legacy_item: SimpleNamespace | None = None,
    ) -> None:
        self.sessions = sessions
        self.legacy_images = legacy_images
        self.legacy_item = legacy_item
        self.commit_calls = 0
        self.rollback_calls = 0

    def now(self) -> datetime:
        return datetime(2026, 8, 16, 12)

    def list_stale_sessions(self, *, from_id: int, limit: int, **_kwargs: Any) -> Any:
        return [item for item in self.sessions if item.id >= from_id][:limit]

    def list_stale_legacy_images(
        self, *, from_id: int, limit: int, **_kwargs: Any
    ) -> Any:
        return [item for item in self.legacy_images if item.id >= from_id][:limit]

    def get_batch_item_for_image(self, _image_file_id: int) -> Any:
        return self.legacy_item

    def commit(self) -> None:
        self.commit_calls += 1

    def rollback(self) -> None:
        self.rollback_calls += 1


class FakeStorage:
    def __init__(self, outcome: StoredObject | Exception) -> None:
        self.outcome = outcome
        self.abort_calls = 0

    async def stat_object(self, **_kwargs: Any) -> StoredObject:
        if isinstance(self.outcome, Exception):
            raise self.outcome
        return self.outcome

    async def abort_multipart_upload(self, **_kwargs: Any) -> None:
        self.abort_calls += 1


class FakeSessionRecovery:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def recover_existing(self, session_id: str) -> UploadStatus:
        self.calls.append(session_id)
        return UploadStatus(
            session_id=session_id,
            file_uuid="file-1",
            status=ImageUploadSessionStatus.COMPLETED.value,
            upload_progress=100,
            image_file_id=42,
            expires_at=None,
            error=None,
        )


class MissingDuringRecovery:
    async def recover_existing(self, _session_id: str) -> UploadStatus:
        raise ObjectStorageObjectNotFoundError("disappeared")


def _service(
    repository: FakeRepository,
    storage: FakeStorage,
    recovery: FakeSessionRecovery | None = None,
) -> UploadReconciliationService:
    return UploadReconciliationService(
        cast(Any, repository),
        cast(Any, SimpleNamespace()),
        cast(Any, recovery or FakeSessionRecovery()),
        cast(Any, storage),
        cast(Any, SimpleNamespace()),
        cast(Any, SimpleNamespace()),
    )


@pytest.mark.asyncio
async def test_dry_run_reports_missing_new_and_legacy_uploads_without_mutation() -> (
    None
):
    session = _session()
    legacy = _legacy_image()
    item = SimpleNamespace(upload_id="upload-legacy")
    repository = FakeRepository([session], [legacy], item)
    storage = FakeStorage(ObjectStorageObjectNotFoundError("missing"))

    result = await _service(repository, storage).run(
        dry_run=True,
        stale_after_seconds=1800,
        batch_size=100,
        from_id=1,
        limit=None,
    )

    assert result.scanned == 2
    assert result.expired == 2
    assert result.aborted == 2
    assert result.legacy == 1
    assert repository.commit_calls == 0
    assert storage.abort_calls == 0
    assert session.status == ImageUploadSessionStatus.READY.value
    assert legacy.is_deleted is False


@pytest.mark.asyncio
async def test_execute_recovers_existing_session_through_shared_completion() -> None:
    repository = FakeRepository([_session()], [])
    storage = FakeStorage(StoredObject(size=7, etag="etag", metadata={}))
    recovery = FakeSessionRecovery()

    result = await _service(repository, storage, recovery).run(
        dry_run=False,
        stale_after_seconds=1800,
        batch_size=100,
        from_id=1,
        limit=None,
    )

    assert result.recovered == 1
    assert result.failed == 0
    assert recovery.calls == ["session-1"]


@pytest.mark.asyncio
async def test_storage_unavailable_does_not_expire_session() -> None:
    session = _session()
    repository = FakeRepository([session], [])
    storage = FakeStorage(ObjectStorageUnavailableError("offline"))

    result = await _service(repository, storage).run(
        dry_run=False,
        stale_after_seconds=1800,
        batch_size=100,
        from_id=1,
        limit=None,
    )

    assert result.failed == 1
    assert result.expired == 0
    assert repository.commit_calls == 0
    assert repository.rollback_calls == 1
    assert session.status == ImageUploadSessionStatus.READY.value


@pytest.mark.asyncio
async def test_object_disappearing_during_recovery_expires_session() -> None:
    session = _session()
    repository = FakeRepository([session], [])
    storage = FakeStorage(StoredObject(size=7, etag="etag", metadata={}))

    result = await _service(
        repository,
        storage,
        cast(Any, MissingDuringRecovery()),
    ).run(
        dry_run=False,
        stale_after_seconds=1800,
        batch_size=100,
        from_id=1,
        limit=None,
    )

    assert result.expired == 1
    assert result.aborted == 1
    assert session.status == ImageUploadSessionStatus.EXPIRED.value
