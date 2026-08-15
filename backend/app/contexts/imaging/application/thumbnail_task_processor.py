"""单个缩略图任务的 claim、生成、版本校验和失败调度。"""

from __future__ import annotations

from collections.abc import Callable
from datetime import datetime, timezone
from typing import Any, Literal

from app.contexts.imaging.application.dto import ThumbnailTaskEvent
from app.contexts.imaging.application.errors import ThumbnailGenerationError
from app.contexts.imaging.application.ports import (
    ThumbnailGenerationGateway,
    ThumbnailTaskRepository,
)

ThumbnailTaskProcessingOutcome = Literal["ack"]


def utc_now_naive() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class ThumbnailTaskProcessor:
    def __init__(
        self,
        repository: ThumbnailTaskRepository,
        generator: ThumbnailGenerationGateway,
        *,
        lease_seconds: int,
        max_retries: int,
        now: Callable[[], datetime] = utc_now_naive,
    ) -> None:
        self._repository = repository
        self._generator = generator
        self._lease_seconds = max(1, lease_seconds)
        self._max_retries = max(1, max_retries)
        self._now = now

    @staticmethod
    def parse_event(payload: dict[str, Any]) -> ThumbnailTaskEvent:
        if payload.get("event_type") != "image.thumbnail.generate.requested":
            raise ValueError("unsupported event type")
        if payload.get("version") != 1:
            raise ValueError("unsupported event version")
        source_etag = payload.get("source_storage_etag")
        return ThumbnailTaskEvent(
            event_type="image.thumbnail.generate.requested",
            version=1,
            derivative_id=int(payload["derivative_id"]),
            image_file_id=int(payload["image_file_id"]),
            source_storage_etag=(str(source_etag) if source_etag is not None else None),
        )

    async def process(self, payload: dict[str, Any]) -> ThumbnailTaskProcessingOutcome:
        try:
            event = self.parse_event(payload)
        except (KeyError, TypeError, ValueError):
            return "ack"
        source = self._repository.claim(
            event,
            now=self._now(),
            lease_seconds=self._lease_seconds,
        )
        if source is None:
            return "ack"
        try:
            result = await self._generator.generate(source)
            old_ref = (
                source.previous_thumbnail_bucket,
                source.previous_thumbnail_object_key,
            )
            new_ref = (result.storage_bucket, result.object_key)
            # Delete the prior immutable version before forgetting its key. A retry uses
            # the same deterministic new key, so cleanup remains idempotent.
            if all(old_ref) and old_ref != new_ref:
                await self._generator.delete(
                    bucket=str(old_ref[0]),
                    object_key=str(old_ref[1]),
                )
            if not self._repository.mark_ready(event, result):
                # Source replacement/deletion won the race; never expose its stale output.
                await self._generator.delete(
                    bucket=result.storage_bucket,
                    object_key=result.object_key,
                )
        except ThumbnailGenerationError as exc:
            self._repository.mark_failed(
                event,
                error=exc.detail,
                transient=exc.transient,
                max_retries=self._max_retries,
                now=self._now(),
            )
        except Exception as exc:  # noqa: BLE001 - unexpected failures are bounded too.
            self._repository.mark_failed(
                event,
                error=str(exc),
                transient=True,
                max_retries=self._max_retries,
                now=self._now(),
            )
        return "ack"
