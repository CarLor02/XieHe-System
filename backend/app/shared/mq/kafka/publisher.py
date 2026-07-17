"""Kafka implementation of the application Publisher contract."""

from __future__ import annotations

import json

from app.shared.mq.publisher import PublishMessage

from .producer import KafkaProducer


class KafkaPublisher:
    """Serialize application messages and delegate byte transport."""

    def __init__(self, producer: KafkaProducer) -> None:
        self._producer = producer

    async def start(self) -> None:
        await self._producer.start()

    async def stop(self) -> None:
        await self._producer.stop()

    async def publish(self, message: PublishMessage) -> None:
        await self._producer.send(
            topic=message.topic,
            key=message.key.encode("utf-8") if message.key else None,
            value=json.dumps(
                message.payload,
                ensure_ascii=False,
                separators=(",", ":"),
            ).encode("utf-8"),
            headers=[
                (name, value.encode("utf-8"))
                for name, value in message.headers.items()
            ],
        )
