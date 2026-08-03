"""SQLAlchemy 批量影像导入持久化与状态汇总。"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import (
    AiTaskEvent,
    CreateImportBatch,
    ImportBatch,
    ImportItem,
    PageResult,
)
from app.contexts.patients.infrastructure.persistence.models import Patient
from app.models.image import AITask, AITaskStatusEnum
from app.models.image_file import ImageFile
from app.models.image_import import (
    ImageImportAiStatus,
    ImageImportBatch,
    ImageImportBatchStatus,
    ImageImportItem,
    ImageImportUploadStatus,
)

TERMINAL_AI_STATUSES = {
    ImageImportAiStatus.SUCCEEDED.value,
    ImageImportAiStatus.FAILED.value,
}


class SqlAlchemyImageImportRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def patient_exists(self, patient_id: int) -> bool:
        return (
            self._session.query(Patient.id).filter(Patient.id == patient_id).first()
            is not None
        )

    def create_batch(
        self,
        *,
        owner_id: int,
        command: CreateImportBatch,
        team_ids: list[int],
    ) -> tuple[ImageImportBatch, list[ImageImportItem]]:
        batch = ImageImportBatch(
            batch_id=uuid.uuid4().hex,
            uploaded_by=owner_id,
            patient_id=command.patient_id,
            description=command.description,
            team_ids=team_ids,
            status=ImageImportBatchStatus.UPLOADING.value,
            total_items=len(command.files),
        )
        self._session.add(batch)
        self._session.flush()
        items = [
            ImageImportItem(
                batch_id=batch.id,
                client_file_id=file.client_file_id,
                filename=file.filename,
                size=file.size,
                mime_type=file.mime_type,
                file_hash=file.file_hash,
                upload_status=ImageImportUploadStatus.PENDING.value,
                ai_status=ImageImportAiStatus.PENDING.value,
            )
            for file in command.files
        ]
        self._session.add_all(items)
        return batch, items

    def get_owned_batch(
        self,
        batch_id: str,
        owner_id: int,
    ) -> ImageImportBatch | None:
        return (
            self._session.query(ImageImportBatch)
            .filter(
                ImageImportBatch.batch_id == batch_id,
                ImageImportBatch.uploaded_by == owner_id,
            )
            .first()
        )

    def get_owned_item(
        self,
        batch: ImageImportBatch,
        item_id: int,
    ) -> ImageImportItem | None:
        return (
            self._session.query(ImageImportItem)
            .filter(
                ImageImportItem.id == item_id,
                ImageImportItem.batch_id == batch.id,
            )
            .first()
        )

    def list_items_by_ids(
        self,
        batch: ImageImportBatch,
        item_ids: list[int],
    ) -> list[ImageImportItem]:
        return (
            self._session.query(ImageImportItem)
            .filter(
                ImageImportItem.batch_id == batch.id,
                ImageImportItem.id.in_(item_ids),
            )
            .order_by(ImageImportItem.id)
            .all()
        )

    def get_active_image(self, image_file_id: int | None) -> ImageFile | None:
        if image_file_id is None:
            return None
        return (
            self._session.query(ImageFile)
            .filter(
                ImageFile.id == image_file_id,
                ImageFile.is_deleted.is_(False),
            )
            .first()
        )

    def add_image(self, image: ImageFile) -> None:
        self._session.add(image)

    def ensure_ai_task(self, item: ImageImportItem, requested_by: int) -> AITask:
        task = (
            self._session.query(AITask)
            .filter(
                AITask.batch_item_id == item.id,
                AITask.is_deleted.is_(False),
            )
            .order_by(AITask.id.desc())
            .first()
        )
        if task is None:
            task = AITask(
                task_id=uuid.uuid4().hex,
                image_file_id=item.image_file_id,
                batch_item_id=item.id,
                task_name=f"批量导入AI测量:{item.filename}",
                task_type="IMAGE_MEASUREMENT",
                model_name="AUTO_BY_EXAM_TYPE",
                input_parameters={"batch_item_id": item.id},
                status=AITaskStatusEnum.PENDING,
                progress=0,
                attempt_count=0,
                created_by=requested_by,
            )
            self._session.add(task)
            self._session.flush()
        elif task.status == AITaskStatusEnum.COMPLETED:
            item.ai_status = ImageImportAiStatus.SUCCEEDED.value
            item.error_message = None
            return task
        elif task.status == AITaskStatusEnum.FAILED:
            task.status = AITaskStatusEnum.PENDING
            task.progress = 0
            task.error_message = None
            task.completed_at = None

        item.ai_status = ImageImportAiStatus.QUEUED.value
        item.error_message = None
        item.updated_at = datetime.now()
        return task

    def ai_task_event(
        self,
        task: AITask,
        item: ImageImportItem,
        batch: ImageImportBatch,
    ) -> AiTaskEvent:
        if item.image_file_id is None:
            raise ValueError("批量导入项尚未关联影像文件")
        return AiTaskEvent(
            event_type="image.ai.predict.requested",
            version=1,
            task_id=str(task.task_id),
            batch_id=str(batch.batch_id),
            batch_item_id=item.id,
            image_file_id=item.image_file_id,
            requested_by=int(task.created_by or 0),
        )

    def refresh_batch_status(self, batch: ImageImportBatch) -> None:
        items = (
            self._session.query(ImageImportItem)
            .filter(ImageImportItem.batch_id == batch.id)
            .all()
        )
        batch.total_items = len(items)
        batch.uploaded_items = sum(
            item.upload_status == ImageImportUploadStatus.UPLOADED.value
            for item in items
        )
        batch.succeeded_items = sum(
            item.ai_status == ImageImportAiStatus.SUCCEEDED.value for item in items
        )
        batch.failed_items = sum(
            item.upload_status == ImageImportUploadStatus.FAILED.value
            or item.ai_status == ImageImportAiStatus.FAILED.value
            for item in items
        )
        terminal_items = batch.succeeded_items + batch.failed_items
        if items and terminal_items == len(items):
            if batch.succeeded_items == len(items):
                batch.status = ImageImportBatchStatus.COMPLETED.value
            elif batch.failed_items == len(items):
                batch.status = ImageImportBatchStatus.FAILED.value
            else:
                batch.status = ImageImportBatchStatus.PARTIAL_FAILED.value
            batch.completed_at = batch.completed_at or datetime.now()
        elif any(
            item.upload_status != ImageImportUploadStatus.PENDING.value
            for item in items
        ):
            batch.status = ImageImportBatchStatus.PROCESSING.value
            batch.completed_at = None
        else:
            batch.status = ImageImportBatchStatus.UPLOADING.value
            batch.completed_at = None
        batch.updated_at = datetime.now()

    def list_batches(
        self,
        *,
        owner_id: int,
        page: int,
        page_size: int,
        status: str | None,
    ) -> PageResult[ImportBatch]:
        query = self._session.query(ImageImportBatch).filter(
            ImageImportBatch.uploaded_by == owner_id
        )
        if status:
            query = query.filter(ImageImportBatch.status == status.upper())
        total = query.count()
        batches = (
            query.order_by(ImageImportBatch.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return PageResult(
            items=[self.batch_view(batch) for batch in batches],
            total=total,
        )

    def list_items(
        self,
        *,
        batch: ImageImportBatch,
        page: int,
        page_size: int,
    ) -> PageResult[ImportItem]:
        query = self._session.query(ImageImportItem).filter(
            ImageImportItem.batch_id == batch.id
        )
        total = query.count()
        items = (
            query.order_by(ImageImportItem.id)
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return PageResult(
            items=[self.item_view(item) for item in items],
            total=total,
        )

    def batch_view(self, batch: ImageImportBatch) -> ImportBatch:
        return ImportBatch(
            batch_id=str(batch.batch_id),
            patient_id=batch.patient_id,
            description=batch.description,
            team_ids=list(cast(list[int], batch.team_ids or [])),
            status=str(batch.status),
            total_items=batch.total_items,
            uploaded_items=batch.uploaded_items,
            succeeded_items=batch.succeeded_items,
            failed_items=batch.failed_items,
            created_at=batch.created_at,
            updated_at=batch.updated_at,
            completed_at=batch.completed_at,
        )

    def item_view(self, item: ImageImportItem) -> ImportItem:
        return ImportItem(
            id=item.id,
            client_file_id=str(item.client_file_id),
            filename=str(item.filename),
            size=item.size,
            mime_type=str(item.mime_type),
            image_file_id=item.image_file_id,
            upload_status=str(item.upload_status),
            ai_status=str(item.ai_status),
            error=item.error_message,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )

    def flush(self) -> None:
        self._session.flush()

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def refresh_item(self, item: ImageImportItem) -> None:
        self._session.refresh(item)
