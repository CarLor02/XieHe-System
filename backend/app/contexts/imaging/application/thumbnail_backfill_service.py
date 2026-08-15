"""可重入的历史影像缩略图调度用例。"""

from __future__ import annotations

from dataclasses import dataclass

from app.contexts.imaging.application.dto import (
    ThumbnailBackfillResult,
    ThumbnailTaskEvent,
)
from app.contexts.imaging.application.ports import ThumbnailSchedulingRepository
from app.contexts.imaging.application.ports.records import ImageFileRecord
from app.contexts.imaging.domain import supports_card_thumbnail

from .thumbnail_scheduling_service import ThumbnailSchedulingService


@dataclass(slots=True)
class _BackfillCounters:
    scanned: int = 0
    queued: int = 0
    skipped: int = 0
    unsupported: int = 0
    failed: int = 0


class ThumbnailBackfillService:
    def __init__(
        self,
        repository: ThumbnailSchedulingRepository,
        scheduling: ThumbnailSchedulingService,
    ) -> None:
        self._repository = repository
        self._scheduling = scheduling

    async def run(
        self,
        *,
        batch_size: int,
        from_id: int,
        limit: int | None,
        dry_run: bool,
    ) -> ThumbnailBackfillResult:
        counters = _BackfillCounters()
        after_id = max(0, from_id - 1)
        while limit is None or counters.scanned < limit:
            page_size = max(1, batch_size)
            if limit is not None:
                page_size = min(page_size, limit - counters.scanned)
            images = self._repository.list_backfill_images(
                after_id=after_id,
                limit=page_size,
            )
            if not images:
                break
            counters.scanned += len(images)
            after_id = images[-1].id
            events = self._prepare_batch(images, dry_run=dry_run, counters=counters)
            if not events:
                continue
            try:
                self._repository.commit()
            except Exception:
                self._repository.rollback()
                raise
            await self._publish(events, counters)

        return ThumbnailBackfillResult(
            scanned=counters.scanned,
            queued=counters.queued,
            skipped=counters.skipped,
            unsupported=counters.unsupported,
            failed=counters.failed,
        )

    def _prepare_batch(
        self,
        images: list[ImageFileRecord],
        *,
        dry_run: bool,
        counters: _BackfillCounters,
    ) -> list[ThumbnailTaskEvent]:
        events: list[ThumbnailTaskEvent] = []
        for image in images:
            if not supports_card_thumbnail(image.file_type):
                counters.unsupported += 1
            elif self._repository.has_ready_for_current_source(image):
                counters.skipped += 1
            elif dry_run:
                counters.queued += 1
            else:
                event = self._scheduling.prepare(image)
                if event is None:
                    counters.skipped += 1
                else:
                    events.append(event)
        return events

    async def _publish(
        self,
        events: list[ThumbnailTaskEvent],
        counters: _BackfillCounters,
    ) -> None:
        for event in events:
            if await self._scheduling.publish_after_commit(event):
                counters.queued += 1
            else:
                counters.failed += 1
