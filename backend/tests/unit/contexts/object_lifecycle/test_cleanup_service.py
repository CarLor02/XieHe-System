from __future__ import annotations

from datetime import datetime

import pytest

from app.contexts.object_lifecycle.application import CleanupExpiredObjectsService
from app.contexts.object_lifecycle.application.errors import ObjectDeletionError
from app.contexts.object_lifecycle.domain import (
    ObjectCleanupCandidate,
    ObjectOwnerKind,
    ObjectRetentionPolicy,
)


class FakeRepository:
    def __init__(self, candidates: list[ObjectCleanupCandidate]) -> None:
        self.candidates = candidates
        self.cutoff: datetime | None = None
        self.marked: list[ObjectCleanupCandidate] = []
        self.committed = False
        self.rolled_back = False
        self.fail_mark = False

    def list_expired(self, cutoff: datetime) -> list[ObjectCleanupCandidate]:
        self.cutoff = cutoff
        return self.candidates

    def mark_purged(self, candidate: ObjectCleanupCandidate) -> None:
        if self.fail_mark:
            raise RuntimeError("database update failed")
        self.marked.append(candidate)

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


class FakeDeletionGateway:
    def __init__(self, failing_keys: set[str] | None = None) -> None:
        self.failing_keys = failing_keys or set()
        self.deleted_keys: list[str] = []

    async def delete_object(self, *, bucket: str, object_key: str) -> None:
        if object_key in self.failing_keys:
            raise ObjectDeletionError(f"cannot delete {bucket}/{object_key}")
        self.deleted_keys.append(object_key)


def candidate(
    owner_kind: ObjectOwnerKind,
    owner_id: int,
    object_key: str,
) -> ObjectCleanupCandidate:
    return ObjectCleanupCandidate(
        owner_kind=owner_kind,
        owner_id=owner_id,
        bucket="medical",
        object_key=object_key,
    )


def test_retention_policy_uses_thirty_day_cutoff() -> None:
    now = datetime(2026, 8, 3, 12, 0, 0)

    assert ObjectRetentionPolicy().cutoff(now) == datetime(2026, 7, 4, 12, 0, 0)


@pytest.mark.asyncio
async def test_cleanup_continues_after_individual_storage_failure() -> None:
    first = candidate(ObjectOwnerKind.IMAGE_FILE, 1, "images/one.png")
    second = candidate(ObjectOwnerKind.USER_AVATAR, 2, "avatars/two.png")
    repository = FakeRepository([first, second])
    gateway = FakeDeletionGateway({first.object_key})
    service = CleanupExpiredObjectsService(repository, gateway)

    result = await service.run(now=datetime(2026, 8, 3, 12, 0, 0))

    assert repository.cutoff == datetime(2026, 7, 4, 12, 0, 0)
    assert repository.marked == [second]
    assert repository.committed is True
    assert repository.rolled_back is False
    assert gateway.deleted_keys == [second.object_key]
    assert result.deleted_count == 1
    assert [failure.candidate for failure in result.failures] == [first]


@pytest.mark.asyncio
async def test_cleanup_rolls_back_database_failure() -> None:
    item = candidate(ObjectOwnerKind.USER_AVATAR, 2, "avatars/two.png")
    repository = FakeRepository([item])
    repository.fail_mark = True
    service = CleanupExpiredObjectsService(repository, FakeDeletionGateway())

    with pytest.raises(RuntimeError, match="database update failed"):
        await service.run(now=datetime(2026, 8, 3, 12, 0, 0))

    assert repository.committed is False
    assert repository.rolled_back is True
