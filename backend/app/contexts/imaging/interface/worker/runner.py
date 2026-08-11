"""Kafka entrypoint for asynchronous imaging AI tasks."""

from __future__ import annotations

import asyncio
import signal

from app.contexts.imaging.application import AiTaskProcessor
from app.contexts.imaging.infrastructure.ai import (
    AiModelClient,
    AiTaskHttpModelGateway,
)
from app.contexts.imaging.infrastructure.persistence import (
    SqlAlchemyAiTaskExecutionRepository,
)
from app.core.config import settings
from app.core.system.logger import LogLevel, logger
from app.shared.mq.kafka import KafkaConsumer, KafkaSubscriber
from app.shared.mq.subscriber import ReceivedMessage, SubscriberDecision


class AiTaskMessageHandler:
    """Translate transport messages into application-level processing outcomes."""

    def __init__(self, processor: AiTaskProcessor) -> None:
        self._processor = processor

    async def __call__(self, message: ReceivedMessage) -> SubscriberDecision:
        outcome = await self._processor.process(dict(message.payload))
        if outcome == "retry":
            return SubscriberDecision.RETRY
        return SubscriberDecision.ACK


async def _run_subscriber(index: int, stop_event: asyncio.Event) -> None:
    model = AiTaskHttpModelGateway(AiModelClient())
    processor = AiTaskProcessor(
        SqlAlchemyAiTaskExecutionRepository(),
        model,
        max_retries=settings.AI_MODEL_MAX_RETRIES,
    )
    subscriber = KafkaSubscriber(
        KafkaConsumer(
            topics=[settings.AI_TASK_KAFKA_TOPIC],
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.AI_TASK_KAFKA_GROUP_ID,
            client_id=f"medical-image-ai-worker-{index}",
        )
    )
    task = asyncio.create_task(subscriber.run(AiTaskMessageHandler(processor)))
    try:
        await stop_event.wait()
    finally:
        await subscriber.stop()
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)
        await model.stop()


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
