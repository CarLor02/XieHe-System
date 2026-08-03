"""Use case for physically deleting expired soft-deleted objects."""

from __future__ import annotations

from datetime import datetime

from app.contexts.object_lifecycle.domain import ObjectRetentionPolicy

from .dto import ObjectCleanupFailure, ObjectCleanupResult
from .errors import ObjectDeletionError
from .ports import ObjectCleanupRepository, ObjectDeletionGateway


class CleanupExpiredObjectsService:
    def __init__(
        self,
        repository: ObjectCleanupRepository,
        deletion_gateway: ObjectDeletionGateway,
        policy: ObjectRetentionPolicy = ObjectRetentionPolicy(),
    ) -> None:
        self._repository = repository
        self._deletion_gateway = deletion_gateway
        self._policy = policy

    async def run(self, *, now: datetime) -> ObjectCleanupResult:
        deleted_count = 0
        failures: list[ObjectCleanupFailure] = []
        try:
            candidates = self._repository.list_expired(self._policy.cutoff(now))
            for candidate in candidates:
                try:
                    await self._deletion_gateway.delete_object(
                        bucket=candidate.bucket,
                        object_key=candidate.object_key,
                    )
                except ObjectDeletionError as exc:
                    failures.append(
                        ObjectCleanupFailure(candidate=candidate, message=str(exc))
                    )
                    continue

                self._repository.mark_purged(candidate)
                deleted_count += 1

            self._repository.commit()
        except Exception:
            self._repository.rollback()
            raise

        return ObjectCleanupResult(
            deleted_count=deleted_count,
            failures=tuple(failures),
        )
