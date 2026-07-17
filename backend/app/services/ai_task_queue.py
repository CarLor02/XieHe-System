"""AI task event publishing lifecycle."""

from __future__ import annotations

from typing import Any

from app.core.config import settings
from app.shared.mq.kafka import KafkaProducer, KafkaPublisher
from app.shared.mq.publisher import PublishMessage, Publisher


_publisher: Publisher = KafkaPublisher(
    KafkaProducer(settings.KAFKA_BOOTSTRAP_SERVERS)
)


def get_ai_task_publisher() -> Publisher:
    return _publisher


def set_ai_task_publisher(publisher: Publisher) -> None:
    """Replace the publisher in tests or alternate deployments."""

    global _publisher
    _publisher = publisher


async def start_ai_task_publisher() -> None:
    await _publisher.start()


async def stop_ai_task_publisher() -> None:
    await _publisher.stop()


async def publish_ai_task_event(payload: dict[str, Any]) -> None:
    image_file_id = payload["image_file_id"]
    await _publisher.publish(
        PublishMessage(
            topic=settings.AI_TASK_KAFKA_TOPIC,
            key=str(image_file_id),
            payload=payload,
        )
    )
