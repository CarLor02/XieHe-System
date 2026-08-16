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

from .records import (
    AiTaskRecord,
    ImageImportBatchRecord,
    ImageImportItemRecord,
)


class ImageImportRepository(Protocol):
    def patient_exists(self, patient_id: int) -> bool: ...

    def create_batch(
        self,
        *,
        owner_id: int,
        command: CreateImportBatch,
        team_ids: list[int],
    ) -> tuple[ImageImportBatchRecord, list[ImageImportItemRecord]]: ...

    def get_owned_batch(
        self, batch_id: str, owner_id: int
    ) -> ImageImportBatchRecord | None: ...

    def get_owned_item(
        self,
        batch: ImageImportBatchRecord,
        item_id: int,
    ) -> ImageImportItemRecord | None: ...

    def get_item_by_id(self, item_id: int) -> ImageImportItemRecord | None: ...

    def get_batch_by_id(self, batch_id: int) -> ImageImportBatchRecord | None: ...

    def list_items_by_ids(
        self,
        batch: ImageImportBatchRecord,
        item_ids: list[int],
    ) -> list[ImageImportItemRecord]: ...

    def ensure_ai_task(
        self, item: ImageImportItemRecord, requested_by: int
    ) -> AiTaskRecord: ...

    def ai_task_event(
        self,
        task: AiTaskRecord,
        item: ImageImportItemRecord,
        batch: ImageImportBatchRecord,
    ) -> AiTaskEvent: ...

    def refresh_batch_status(self, batch: ImageImportBatchRecord) -> None: ...

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
        batch: ImageImportBatchRecord,
        page: int,
        page_size: int,
    ) -> PageResult[ImportItem]: ...

    def batch_view(self, batch: ImageImportBatchRecord) -> ImportBatch: ...

    def item_view(self, item: ImageImportItemRecord) -> ImportItem: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def refresh_item(self, item: ImageImportItemRecord) -> None: ...
