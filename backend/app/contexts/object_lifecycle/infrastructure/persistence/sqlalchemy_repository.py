"""SQLAlchemy adapter for expired image and avatar objects."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.contexts.access_control.infrastructure.persistence.models import User
from app.contexts.imaging.domain import ImageDerivativeStatus
from app.contexts.imaging.infrastructure.persistence import (
    ImageFile,
    ImageFileDerivative,
)
from app.contexts.object_lifecycle.domain import (
    ObjectCleanupCandidate,
    ObjectOwnerKind,
)


class SqlAlchemyObjectCleanupRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def list_expired(self, cutoff: datetime) -> list[ObjectCleanupCandidate]:
        candidates = self._expired_images(cutoff)
        candidates.extend(self._expired_avatars(cutoff))
        return candidates

    def mark_purged(self, candidate: ObjectCleanupCandidate) -> None:
        if candidate.owner_kind is ObjectOwnerKind.IMAGE_FILE:
            # Image rows remain as soft-deleted audit records; no purge marker exists yet.
            return

        if candidate.owner_kind is ObjectOwnerKind.IMAGE_FILE_DERIVATIVE:
            derivative = self._session.get(ImageFileDerivative, candidate.owner_id)
            if (
                derivative is None
                or derivative.storage_bucket != candidate.bucket
                or derivative.object_key != candidate.object_key
            ):
                return
            derivative.storage_bucket = None
            derivative.object_key = None
            derivative.storage_etag = None
            derivative.status = ImageDerivativeStatus.FAILED.value
            derivative.last_error = "所属影像已删除，派生对象已清理"
            derivative.next_retry_at = None
            derivative.lease_expires_at = None
            return

        user = self._session.get(User, candidate.owner_id)
        if (
            user is None
            or user.avatar_storage_bucket != candidate.bucket
            or user.avatar_object_key != candidate.object_key
        ):
            return
        user.avatar_storage_bucket = None
        user.avatar_object_key = None
        user.avatar_storage_etag = None
        user.avatar_deleted_at = None

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def _expired_images(self, cutoff: datetime) -> list[ObjectCleanupCandidate]:
        images = (
            self._session.query(ImageFile)
            .filter(
                ImageFile.is_deleted.is_(True),
                ImageFile.deleted_at.isnot(None),
                ImageFile.deleted_at < cutoff,
                ImageFile.storage_bucket.isnot(None),
                ImageFile.object_key.isnot(None),
            )
            .all()
        )
        original_candidates = [
            ObjectCleanupCandidate(
                owner_kind=ObjectOwnerKind.IMAGE_FILE,
                owner_id=int(image.id),
                bucket=str(image.storage_bucket),
                object_key=str(image.object_key),
            )
            for image in images
        ]
        if not images:
            return original_candidates
        derivatives = (
            self._session.query(ImageFileDerivative)
            .filter(
                ImageFileDerivative.image_file_id.in_([image.id for image in images]),
                ImageFileDerivative.storage_bucket.isnot(None),
                ImageFileDerivative.object_key.isnot(None),
            )
            .all()
        )
        original_candidates.extend(
            ObjectCleanupCandidate(
                owner_kind=ObjectOwnerKind.IMAGE_FILE_DERIVATIVE,
                owner_id=int(derivative.id),
                bucket=str(derivative.storage_bucket),
                object_key=str(derivative.object_key),
            )
            for derivative in derivatives
        )
        return original_candidates

    def _expired_avatars(self, cutoff: datetime) -> list[ObjectCleanupCandidate]:
        users = (
            self._session.query(User)
            .filter(
                User.avatar_deleted_at.isnot(None),
                User.avatar_deleted_at < cutoff,
                User.avatar_storage_bucket.isnot(None),
                User.avatar_object_key.isnot(None),
            )
            .all()
        )
        return [
            ObjectCleanupCandidate(
                owner_kind=ObjectOwnerKind.USER_AVATAR,
                owner_id=int(user.id),
                bucket=str(user.avatar_storage_bucket),
                object_key=str(user.avatar_object_key),
            )
            for user in users
        ]
