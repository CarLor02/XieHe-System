"""Kafka entrypoint and recovery scanner for card thumbnail tasks."""

from __future__ import annotations

import asyncio
import signal
from datetime import timedelta

from app.contexts.imaging.application import ThumbnailTaskProcessor
from app.contexts.imaging.application.thumbnail_task_processor import utc_now_naive
from app.contexts.imaging.infrastructure.messaging import (
    KafkaThumbnailTaskPublisher,
    start_thumbnail_task_publisher,
    stop_thumbnail_task_publisher,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyThumbnailTaskRepository,
)
from app.contexts.imaging.infrastructure.thumbnail import (
    PillowThumbnailGenerationGateway,
)
from app.core.config import settings
from app.core.system.logger import LogLevel, logger
from app.shared.mq.kafka import KafkaConsumer, KafkaSubscriber
from app.shared.mq.subscriber import ReceivedMessage, SubscriberDecision
from app.shared.storage import storage_service_client


class ThumbnailTaskMessageHandler:
    def __init__(self, processor: ThumbnailTaskProcessor) -> None:
        self._processor = processor

    async def __call__(self, message: ReceivedMessage) -> SubscriberDecision:
        await self._processor.process(dict(message.payload))
        return SubscriberDecision.ACK


async def _run_subscriber(index: int, stop_event: asyncio.Event) -> None:
    processor = ThumbnailTaskProcessor(
        SqlAlchemyThumbnailTaskRepository(),
        PillowThumbnailGenerationGateway(),
        lease_seconds=settings.THUMBNAIL_PROCESSING_LEASE_SECONDS,
        max_retries=settings.THUMBNAIL_MAX_RETRIES,
    )
    subscriber = KafkaSubscriber(
        KafkaConsumer(
            topics=[settings.THUMBNAIL_TASK_KAFKA_TOPIC],
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.THUMBNAIL_TASK_KAFKA_GROUP_ID,
            client_id=f"medical-image-thumbnail-worker-{index}",
        )
    )
    task = asyncio.create_task(subscriber.run(ThumbnailTaskMessageHandler(processor)))
    try:
        await stop_event.wait()
    finally:
        await subscriber.stop()
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)


async def _run_requeue_scanner(stop_event: asyncio.Event) -> None:
    interval = max(1, settings.THUMBNAIL_REQUEUE_INTERVAL_SECONDS)
    repository = SqlAlchemyThumbnailTaskRepository()
    publisher = KafkaThumbnailTaskPublisher()
    while not stop_event.is_set():
        now = utc_now_naive()
        try:
            events = repository.list_requeue_candidates(
                now=now,
                pending_before=now - timedelta(seconds=interval),
                limit=500,
            )
            for event in events:
                await publisher.publish(event)
            if events:
                logger.emit_event(
                    LogLevel.INFO,
                    message=f"缩略图扫描器重新入队 {len(events)} 个任务",
                )
        except Exception as exc:  # noqa: BLE001 - next interval must keep recovering.
            logger.emit_event(
                LogLevel.ERROR,
                message=f"缩略图任务扫描失败: {exc}",
            )
        try:
            await asyncio.wait_for(stop_event.wait(), timeout=interval)
        except TimeoutError:
            continue


async def run_worker() -> None:
    concurrency = max(1, settings.THUMBNAIL_WORKER_CONCURRENCY)
    stop_event = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(signal_name, stop_event.set)
    await storage_service_client.start()
    await start_thumbnail_task_publisher()
    logger.emit_event(
        LogLevel.INFO,
        message=f"Thumbnail Worker 启动，消费者并发数: {concurrency}",
    )
    try:
        await asyncio.gather(
            _run_requeue_scanner(stop_event),
            *(_run_subscriber(index, stop_event) for index in range(concurrency)),
        )
    finally:
        await stop_thumbnail_task_publisher()
        await storage_service_client.stop()


def main() -> None:
    asyncio.run(run_worker())
