"""在影像内容事务中登记缩略图，并在提交后发布任务。"""

from __future__ import annotations

from app.contexts.imaging.application.dto import ThumbnailTaskEvent
from app.contexts.imaging.application.ports import (
    ImageFileRecord,
    ThumbnailSchedulingRepository,
    ThumbnailTaskPublisher,
)
from app.contexts.imaging.domain import supports_card_thumbnail
from app.core.system.logger import LogLevel, logger


class ThumbnailSchedulingService:
    def __init__(
        self,
        repository: ThumbnailSchedulingRepository,
        publisher: ThumbnailTaskPublisher,
    ) -> None:
        self._repository = repository
        self._publisher = publisher

    def prepare(self, image: ImageFileRecord) -> ThumbnailTaskEvent | None:
        """Must run before the caller commits its image content transaction."""

        if not supports_card_thumbnail(image.file_type):
            return None
        derivative = self._repository.upsert_pending(image)
        if derivative is None:
            return None
        return ThumbnailTaskEvent(
            event_type="image.thumbnail.generate.requested",
            version=1,
            derivative_id=derivative.id,
            image_file_id=image.id,
            source_storage_etag=derivative.source_storage_etag,
        )

    async def publish_after_commit(self, event: ThumbnailTaskEvent | None) -> bool:
        """Queue availability never changes the durability of an uploaded image."""

        if event is None:
            return True
        try:
            await self._publisher.publish(event)
        except Exception as exc:  # noqa: BLE001 - scanner re-enqueues durable PENDING rows.
            logger.emit_event(
                LogLevel.ERROR,
                message=(
                    f"缩略图任务发布失败，将由扫描器重试: image={event.image_file_id}, "
                    f"error={exc}"
                ),
            )
            return False
        return True
