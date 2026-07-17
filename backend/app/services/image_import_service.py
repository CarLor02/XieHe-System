"""Application services for persistent batch image imports."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.image import AITask, AITaskStatusEnum
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


def refresh_batch_status(db: Session, batch: ImageImportBatch) -> None:
    """Recalculate summary counters and terminal batch status."""

    items = (
        db.query(ImageImportItem)
        .filter(ImageImportItem.batch_id == batch.id)
        .all()
    )
    batch.total_items = len(items)
    batch.uploaded_items = sum(
        item.upload_status == ImageImportUploadStatus.UPLOADED.value
        for item in items
    )
    batch.succeeded_items = sum(
        item.ai_status == ImageImportAiStatus.SUCCEEDED.value
        for item in items
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


def ensure_ai_task(
    db: Session,
    item: ImageImportItem,
    *,
    requested_by: int,
) -> AITask:
    """Return the item's active task, creating one when needed."""

    task = (
        db.query(AITask)
        .filter(
            AITask.batch_item_id == item.id,
            AITask.is_deleted == False,
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
        db.add(task)
        db.flush()
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
    task: AITask,
    item: ImageImportItem,
    batch: ImageImportBatch,
) -> dict[str, Any]:
    return {
        "event_type": "image.ai.predict.requested",
        "version": 1,
        "task_id": task.task_id,
        "batch_id": batch.batch_id,
        "batch_item_id": item.id,
        "image_file_id": item.image_file_id,
        "requested_by": task.created_by,
    }


def serialize_import_item(item: ImageImportItem) -> dict[str, Any]:
    return {
        "id": item.id,
        "client_file_id": item.client_file_id,
        "filename": item.filename,
        "size": item.size,
        "mime_type": item.mime_type,
        "image_file_id": item.image_file_id,
        "upload_status": item.upload_status,
        "ai_status": item.ai_status,
        "error": item.error_message,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


def serialize_import_batch(batch: ImageImportBatch) -> dict[str, Any]:
    return {
        "batch_id": batch.batch_id,
        "patient_id": batch.patient_id,
        "description": batch.description,
        "team_ids": batch.team_ids or [],
        "status": batch.status,
        "total_items": batch.total_items,
        "uploaded_items": batch.uploaded_items,
        "succeeded_items": batch.succeeded_items,
        "failed_items": batch.failed_items,
        "created_at": batch.created_at,
        "updated_at": batch.updated_at,
        "completed_at": batch.completed_at,
    }
