"""Kafka publisher lifecycle and imaging task adapter."""

from dataclasses import asdict
from typing import Any

from app.contexts.imaging.application.dto import AiTaskEvent
from app.core.config import settings
from app.shared.mq.kafka import KafkaProducer, KafkaPublisher
from app.shared.mq.publisher import Publisher, PublishMessage

_publisher: Publisher = KafkaPublisher(KafkaProducer(settings.KAFKA_BOOTSTRAP_SERVERS))


def get_ai_task_publisher() -> Publisher:
    return _publisher


def set_ai_task_publisher(publisher: Publisher) -> None:
    global _publisher
    _publisher = publisher


async def start_ai_task_publisher() -> None:
    await _publisher.start()


async def stop_ai_task_publisher() -> None:
    await _publisher.stop()


async def publish_ai_task_event(payload: dict[str, Any]) -> None:
    await _publisher.publish(
        PublishMessage(
            topic=settings.AI_TASK_KAFKA_TOPIC,
            key=str(payload["image_file_id"]),
            payload=payload,
        )
    )


class KafkaAiTaskPublisher:
    async def publish(self, event: AiTaskEvent) -> None:
        await publish_ai_task_event(asdict(event))
