"""批量影像导入持久化端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import (
    AiTaskEvent,
    CreateImportBatch,
    ImportBatch,
    ImportItem,
    PageResult,
)
from app.models.image import AITask
from app.models.image_file import ImageFile
from app.models.image_import import ImageImportBatch, ImageImportItem


class ImageImportRepository(Protocol):
    def patient_exists(self, patient_id: int) -> bool: ...

    def create_batch(
        self,
        *,
        owner_id: int,
        command: CreateImportBatch,
        team_ids: list[int],
    ) -> tuple[ImageImportBatch, list[ImageImportItem]]: ...

    def get_owned_batch(
        self, batch_id: str, owner_id: int
    ) -> ImageImportBatch | None: ...

    def get_owned_item(
        self,
        batch: ImageImportBatch,
        item_id: int,
    ) -> ImageImportItem | None: ...

    def list_items_by_ids(
        self,
        batch: ImageImportBatch,
        item_ids: list[int],
    ) -> list[ImageImportItem]: ...

    def get_active_image(self, image_file_id: int | None) -> ImageFile | None: ...

    def add_image(self, image: ImageFile) -> None: ...

    def ensure_ai_task(self, item: ImageImportItem, requested_by: int) -> AITask: ...

    def ai_task_event(
        self,
        task: AITask,
        item: ImageImportItem,
        batch: ImageImportBatch,
    ) -> AiTaskEvent: ...

    def refresh_batch_status(self, batch: ImageImportBatch) -> None: ...

    def list_batches(
        self,
        *,
        owner_id: int,
        page: int,
        page_size: int,
        status: str | None,
    ) -> PageResult[ImportBatch]: ...

    def list_items(
        self,
        *,
        batch: ImageImportBatch,
        page: int,
        page_size: int,
    ) -> PageResult[ImportItem]: ...

    def batch_view(self, batch: ImageImportBatch) -> ImportBatch: ...

    def item_view(self, item: ImageImportItem) -> ImportItem: ...

    def flush(self) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def refresh_item(self, item: ImageImportItem) -> None: ...
