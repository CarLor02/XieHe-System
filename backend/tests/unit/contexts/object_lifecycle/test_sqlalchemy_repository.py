from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

from sqlalchemy.orm import Session

from app.contexts.object_lifecycle.domain import (
    ObjectCleanupCandidate,
    ObjectOwnerKind,
)
from app.contexts.object_lifecycle.infrastructure.persistence import (
    SqlAlchemyObjectCleanupRepository,
)


def avatar_candidate() -> ObjectCleanupCandidate:
    return ObjectCleanupCandidate(
        owner_kind=ObjectOwnerKind.USER_AVATAR,
        owner_id=9,
        bucket="avatars",
        object_key="users/9/old.png",
    )


def test_mark_purged_clears_matching_avatar_metadata() -> None:
    session = MagicMock(spec=Session)
    user = SimpleNamespace(
        avatar_storage_bucket="avatars",
        avatar_object_key="users/9/old.png",
        avatar_storage_etag="etag",
        avatar_deleted_at=object(),
    )
    session.get.return_value = user
    repository = SqlAlchemyObjectCleanupRepository(session)

    repository.mark_purged(avatar_candidate())

    assert user.avatar_storage_bucket is None
    assert user.avatar_object_key is None
    assert user.avatar_storage_etag is None
    assert user.avatar_deleted_at is None


def test_mark_purged_preserves_concurrently_replaced_avatar() -> None:
    session = MagicMock(spec=Session)
    user = SimpleNamespace(
        avatar_storage_bucket="avatars",
        avatar_object_key="users/9/new.png",
        avatar_storage_etag="new-etag",
        avatar_deleted_at=None,
    )
    session.get.return_value = user
    repository = SqlAlchemyObjectCleanupRepository(session)

    repository.mark_purged(avatar_candidate())

    assert user.avatar_object_key == "users/9/new.png"
    assert user.avatar_storage_etag == "new-etag"
