"""SQLAlchemy persistence adapter for asynchronous AI task execution."""

from collections.abc import Callable
from datetime import datetime
from typing import Any, cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application import (
    AnnotationApplicationService,
    ImageVisibilityApplicationService,
)
from app.contexts.imaging.application.ai_annotation_mapper import (
    build_annotation_from_ai_response,
)
from app.contexts.imaging.application.dto import AiImageReference, AiTaskEvent
from app.contexts.imaging.application.ports import ImageImportBatchRecord
from app.contexts.imaging.domain import (
    AITaskStatusEnum,
    AnnotationMutationReason,
    AnnotationSource,
    ImageFileStatusEnum,
    ImageImportAiStatus,
)
from app.core.system.logger import LogLevel, logger
from app.shared.database import SessionLocal

from .access_scope import SqlAlchemyImageVisibilityRepository
from .ai_task_models import AITask
from .annotation_repository import SqlAlchemyAnnotationRepository
from .image_file_models import ImageFile
from .image_import_models import ImageImportBatch, ImageImportItem
from .image_import_repository import SqlAlchemyImageImportRepository


class SqlAlchemyAiTaskExecutionRepository:
    def __init__(self, session_factory: Callable[[], Session] = SessionLocal) -> None:
        self._session_factory = session_factory

    def claim(self, event: AiTaskEvent) -> AiImageReference | None:
        db = self._session_factory()
        try:
            task = (
                db.query(AITask)
                .filter(
                    AITask.task_id == event.task_id,
                    AITask.is_deleted.is_(False),
                )
                .with_for_update()
                .first()
            )
            item = (
                db.query(ImageImportItem)
                .filter(ImageImportItem.id == event.batch_item_id)
                .first()
            )
            image = (
                db.query(ImageFile)
                .filter(
                    ImageFile.id == event.image_file_id,
                    ImageFile.is_deleted.is_(False),
                )
                .first()
            )
            if task is None or item is None or image is None:
                logger.emit_event(
                    LogLevel.ERROR,
                    message=f"AI任务关联数据不存在: task={event.task_id}",
                )
                db.rollback()
                return None
            if task.status in {
                AITaskStatusEnum.COMPLETED,
                AITaskStatusEnum.CANCELLED,
                AITaskStatusEnum.FAILED,
            }:
                db.rollback()
                return None
            task.status = AITaskStatusEnum.RUNNING
            task.started_at = task.started_at or datetime.now()
            task.attempt_count = (task.attempt_count or 0) + 1
            task.progress = 10
            item.ai_status = ImageImportAiStatus.RUNNING.value
            item.error_message = None
            image.status = ImageFileStatusEnum.PROCESSING
            self._refresh_batch(db, item)
            db.commit()
            db.refresh(image)
            return AiImageReference(
                id=image.id,
                storage_bucket=image.storage_bucket,
                object_key=image.object_key,
                description=image.description,
            )
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def mark_success(self, event: AiTaskEvent, response: dict[str, Any]) -> None:
        db = self._session_factory()
        try:
            task, item, image = self._load_records(db, event)
            if task is None or item is None or image is None:
                db.rollback()
                return
            self._write_annotation(
                db,
                image,
                response=response,
                actor_id=event.requested_by,
            )
            task.status = AITaskStatusEnum.COMPLETED
            task.progress = 100
            task.result = response
            task.completed_at = datetime.now()
            task.error_message = None
            item.ai_status = ImageImportAiStatus.SUCCEEDED.value
            item.error_message = None
            item.updated_at = datetime.now()
            self._refresh_batch(db, item)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def mark_retry(self, event: AiTaskEvent, error: str) -> None:
        db = self._session_factory()
        try:
            task, item, image = self._load_records(db, event)
            if task is not None:
                task.status = AITaskStatusEnum.PENDING
                task.error_message = error
            if item is not None:
                item.ai_status = ImageImportAiStatus.QUEUED.value
                item.error_message = error
                self._refresh_batch(db, item)
            if image is not None:
                image.status = ImageFileStatusEnum.UPLOADED
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    def mark_failed(self, event: AiTaskEvent, error: str) -> None:
        db = self._session_factory()
        try:
            task, item, image = self._load_records(db, event)
            if task is not None:
                task.status = AITaskStatusEnum.FAILED
                task.error_message = error
                task.completed_at = datetime.now()
            if item is not None:
                item.ai_status = ImageImportAiStatus.FAILED.value
                item.error_message = error
                self._refresh_batch(db, item)
            if image is not None:
                image.status = ImageFileStatusEnum.FAILED
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def _load_records(
        db: Session, event: AiTaskEvent
    ) -> tuple[AITask | None, ImageImportItem | None, ImageFile | None]:
        return (
            db.query(AITask).filter(AITask.task_id == event.task_id).first(),
            db.query(ImageImportItem)
            .filter(ImageImportItem.id == event.batch_item_id)
            .first(),
            db.query(ImageFile).filter(ImageFile.id == event.image_file_id).first(),
        )

    @staticmethod
    def _refresh_batch(db: Session, item: ImageImportItem) -> None:
        batch = (
            db.query(ImageImportBatch)
            .filter(ImageImportBatch.id == item.batch_id)
            .first()
        )
        if batch is not None:
            SqlAlchemyImageImportRepository(db).refresh_batch_status(
                cast(ImageImportBatchRecord, batch)
            )

    @staticmethod
    def _write_annotation(
        db: Session,
        image: ImageFile,
        *,
        response: dict[str, Any],
        actor_id: int,
    ) -> None:
        repository = SqlAlchemyAnnotationRepository(db)
        locked_image = repository.get_for_update(image.id)
        if locked_image is None:
            raise ValueError(f"影像文件不存在: {image.id}")
        annotation = build_annotation_from_ai_response(
            image_file_id=locked_image.id,
            patient_id=locked_image.patient_id,
            exam_type=locked_image.description,
            ai_response=response,
        )
        AnnotationApplicationService(
            repository,
            ImageVisibilityApplicationService(SqlAlchemyImageVisibilityRepository(db)),
        ).save_locked_image(
            image=locked_image,
            actor_id=actor_id,
            annotation=annotation,
            source=AnnotationSource.AI,
            reason=AnnotationMutationReason.AI_IMPORT,
        )
