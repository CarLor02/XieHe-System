"""Kafka-driven AI measurement worker for batch image imports."""

from __future__ import annotations

import asyncio
import signal
from datetime import datetime
from types import SimpleNamespace
from typing import Any

from app.contexts.imaging.infrastructure.persistence import (
    SqlAlchemyImageImportRepository,
)
from app.core.config import settings
from app.core.database.session import SessionLocal
from app.core.system.logger import LogLevel, logger
from app.models.image import AITask, AITaskStatusEnum
from app.models.image_file import ImageFile, ImageFileStatusEnum
from app.models.image_import import (
    ImageImportAiStatus,
    ImageImportBatch,
    ImageImportItem,
)
from app.services.ai_model_client import AiModelClient, AiModelRequestError
from app.services.batch_ai_import import persist_ai_annotation
from app.shared.mq.kafka import KafkaConsumer, KafkaSubscriber
from app.shared.mq.subscriber import ReceivedMessage, SubscriberDecision


class AiTaskProcessor:
    """Claim one durable task, run inference, and persist its terminal state."""

    def __init__(self, model_client: AiModelClient) -> None:
        self._model_client = model_client

    @staticmethod
    def _event_ids(payload: dict[str, Any]) -> tuple[str, int, int, int]:
        if payload.get("event_type") != "image.ai.predict.requested":
            raise ValueError("unsupported event type")
        if payload.get("version") != 1:
            raise ValueError("unsupported event version")
        return (
            str(payload["task_id"]),
            int(payload["batch_item_id"]),
            int(payload["image_file_id"]),
            int(payload["requested_by"]),
        )

    @staticmethod
    def _claim_task(task_id: str, item_id: int, image_file_id: int) -> Any | None:
        db = SessionLocal()
        try:
            task = (
                db.query(AITask)
                .filter(AITask.task_id == task_id, AITask.is_deleted.is_(False))
                .with_for_update()
                .first()
            )
            item = (
                db.query(ImageImportItem).filter(ImageImportItem.id == item_id).first()
            )
            image = (
                db.query(ImageFile)
                .filter(
                    ImageFile.id == image_file_id,
                    ImageFile.is_deleted.is_(False),
                )
                .first()
            )
            if task is None or item is None or image is None:
                logger.emit_event(
                    LogLevel.ERROR,
                    message=f"AI任务关联数据不存在: task={task_id}",
                )
                db.rollback()
                return None
            terminal_statuses = {
                AITaskStatusEnum.COMPLETED,
                AITaskStatusEnum.CANCELLED,
                AITaskStatusEnum.FAILED,
            }
            if task.status in terminal_statuses:
                db.rollback()
                return None

            task.status = AITaskStatusEnum.RUNNING
            task.started_at = task.started_at or datetime.now()
            task.attempt_count = (task.attempt_count or 0) + 1
            task.progress = 10
            item.ai_status = ImageImportAiStatus.RUNNING.value
            item.error_message = None
            image.status = ImageFileStatusEnum.PROCESSING
            batch = (
                db.query(ImageImportBatch)
                .filter(ImageImportBatch.id == item.batch_id)
                .first()
            )
            if batch is not None:
                SqlAlchemyImageImportRepository(db).refresh_batch_status(batch)
            db.commit()
            db.refresh(image)
            return SimpleNamespace(
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

    @staticmethod
    def _persist_success(
        task_id: str,
        item_id: int,
        image_file_id: int,
        requested_by: int,
        response: dict[str, Any],
    ) -> None:
        db = SessionLocal()
        try:
            task = db.query(AITask).filter(AITask.task_id == task_id).first()
            item = (
                db.query(ImageImportItem).filter(ImageImportItem.id == item_id).first()
            )
            image = db.query(ImageFile).filter(ImageFile.id == image_file_id).first()
            if task is None or item is None or image is None:
                db.rollback()
                return

            persist_ai_annotation(db, image, ai_response=response, user_id=requested_by)
            task.status = AITaskStatusEnum.COMPLETED
            task.progress = 100
            task.result = response
            task.completed_at = datetime.now()
            task.error_message = None
            item.ai_status = ImageImportAiStatus.SUCCEEDED.value
            item.error_message = None
            item.updated_at = datetime.now()
            batch = (
                db.query(ImageImportBatch)
                .filter(ImageImportBatch.id == item.batch_id)
                .first()
            )
            if batch is not None:
                SqlAlchemyImageImportRepository(db).refresh_batch_status(batch)
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    async def __call__(self, message: ReceivedMessage) -> SubscriberDecision:
        try:
            task_id, item_id, image_file_id, requested_by = self._event_ids(
                dict(message.payload)
            )
        except (KeyError, TypeError, ValueError) as exc:
            logger.emit_event(LogLevel.ERROR, message=f"AI任务事件格式错误: {exc}")
            return SubscriberDecision.ACK

        image_ref = self._claim_task(task_id, item_id, image_file_id)
        if image_ref is None:
            return SubscriberDecision.ACK

        try:
            response = await self._predict_with_retries(image_ref)
        except AiModelRequestError as exc:
            if exc.transient:
                self._mark_retry(task_id, item_id, image_file_id, str(exc))
                return SubscriberDecision.RETRY
            self._mark_failed(task_id, item_id, image_file_id, str(exc))
            return SubscriberDecision.ACK
        except Exception as exc:  # noqa: BLE001 - retain offset for infrastructure failures.
            self._mark_retry(task_id, item_id, image_file_id, str(exc))
            return SubscriberDecision.RETRY

        self._persist_success(
            task_id,
            item_id,
            image_file_id,
            requested_by,
            response,
        )
        return SubscriberDecision.ACK

    async def _predict_with_retries(self, image: Any) -> dict[str, Any]:
        attempts = max(1, settings.AI_MODEL_MAX_RETRIES)
        last_error: AiModelRequestError | None = None
        for attempt in range(attempts):
            try:
                return await self._model_client.predict(image)
            except AiModelRequestError as exc:
                last_error = exc
                if not exc.transient or attempt + 1 >= attempts:
                    raise
                await asyncio.sleep(min(2**attempt, 5))
        assert last_error is not None
        raise last_error

    @staticmethod
    def _mark_retry(task_id: str, item_id: int, image_file_id: int, error: str) -> None:
        db = SessionLocal()
        try:
            task = db.query(AITask).filter(AITask.task_id == task_id).first()
            item = (
                db.query(ImageImportItem).filter(ImageImportItem.id == item_id).first()
            )
            image = db.query(ImageFile).filter(ImageFile.id == image_file_id).first()
            if task is not None:
                task.status = AITaskStatusEnum.PENDING
                task.error_message = error
            if item is not None:
                item.ai_status = ImageImportAiStatus.QUEUED.value
                item.error_message = error
                batch = (
                    db.query(ImageImportBatch)
                    .filter(ImageImportBatch.id == item.batch_id)
                    .first()
                )
                if batch is not None:
                    SqlAlchemyImageImportRepository(db).refresh_batch_status(batch)
            if image is not None:
                image.status = ImageFileStatusEnum.UPLOADED
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    @staticmethod
    def _mark_failed(
        task_id: str, item_id: int, image_file_id: int, error: str
    ) -> None:
        db = SessionLocal()
        try:
            now = datetime.now()
            task = db.query(AITask).filter(AITask.task_id == task_id).first()
            item = (
                db.query(ImageImportItem).filter(ImageImportItem.id == item_id).first()
            )
            image = db.query(ImageFile).filter(ImageFile.id == image_file_id).first()
            if task is not None:
                task.status = AITaskStatusEnum.FAILED
                task.error_message = error
                task.completed_at = now
            if item is not None:
                item.ai_status = ImageImportAiStatus.FAILED.value
                item.error_message = error
                batch = (
                    db.query(ImageImportBatch)
                    .filter(ImageImportBatch.id == item.batch_id)
                    .first()
                )
                if batch is not None:
                    SqlAlchemyImageImportRepository(db).refresh_batch_status(batch)
            if image is not None:
                image.status = ImageFileStatusEnum.FAILED
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


async def _run_subscriber(index: int, stop_event: asyncio.Event) -> None:
    model_client = AiModelClient()
    subscriber = KafkaSubscriber(
        KafkaConsumer(
            topics=[settings.AI_TASK_KAFKA_TOPIC],
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.AI_TASK_KAFKA_GROUP_ID,
            client_id=f"medical-image-ai-worker-{index}",
        )
    )
    processor = AiTaskProcessor(model_client)
    task = asyncio.create_task(subscriber.run(processor))
    try:
        await stop_event.wait()
    finally:
        await subscriber.stop()
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        await model_client.stop()


async def run_worker() -> None:
    concurrency = max(1, settings.AI_WORKER_CONCURRENCY)
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signal_name, stop_event.set)
    logger.emit_event(
        LogLevel.INFO,
        message=f"AI Worker 启动，消费者并发数: {concurrency}",
    )
    await asyncio.gather(
        *(_run_subscriber(index, stop_event) for index in range(concurrency))
    )


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
