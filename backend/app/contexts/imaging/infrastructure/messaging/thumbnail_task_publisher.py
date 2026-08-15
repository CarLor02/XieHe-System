"""Kafka publisher lifecycle for asynchronous card thumbnail generation."""

from dataclasses import asdict

from app.contexts.imaging.application.dto import ThumbnailTaskEvent
from app.core.config import settings
from app.shared.mq.kafka import KafkaProducer, KafkaPublisher
from app.shared.mq.publisher import Publisher, PublishMessage

_publisher: Publisher = KafkaPublisher(KafkaProducer(settings.KAFKA_BOOTSTRAP_SERVERS))


def get_thumbnail_task_publisher() -> Publisher:
    return _publisher


def set_thumbnail_task_publisher(publisher: Publisher) -> None:
    global _publisher
    _publisher = publisher


async def start_thumbnail_task_publisher() -> None:
    await _publisher.start()


async def stop_thumbnail_task_publisher() -> None:
    await _publisher.stop()


class KafkaThumbnailTaskPublisher:
    async def publish(self, event: ThumbnailTaskEvent) -> None:
        await _publisher.publish(
            PublishMessage(
                topic=settings.THUMBNAIL_TASK_KAFKA_TOPIC,
                key=str(event.image_file_id),
                payload=asdict(event),
            )
        )
