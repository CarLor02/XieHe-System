"""Kafka implementation of the application Subscriber contract."""

from __future__ import annotations

import asyncio
import json
from collections.abc import Mapping

from app.core.system.logger import LogLevel, logger
from app.shared.mq.subscriber import (
    MessageHandler,
    ReceivedMessage,
    SubscriberDecision,
)

from .consumer import KafkaConsumer


class KafkaSubscriber:
    """Decode Kafka records and apply explicit ACK/RETRY semantics."""

    def __init__(self, consumer: KafkaConsumer, *, retry_delay_seconds: float = 2.0) -> None:
        self._consumer = consumer
        self._retry_delay_seconds = retry_delay_seconds
        self._stopping = False

    async def start(self) -> None:
        self._stopping = False
        await self._consumer.start()

    async def stop(self) -> None:
        self._stopping = True
        await self._consumer.stop()

    async def run(self, handler: MessageHandler) -> None:
        await self.start()
        while not self._stopping:
            record = await self._consumer.getone()
            try:
                payload = json.loads(record.value.decode("utf-8"))
                if not isinstance(payload, Mapping):
                    raise ValueError("Kafka payload must be a JSON object")
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError) as exc:
                logger.emit_event(
                    LogLevel.ERROR,
                    message=(
                        "丢弃无法解析的 Kafka 消息 "
                        f"{record.topic}[{record.partition}]@{record.offset}: {exc}"
                    ),
                )
                await self._consumer.commit(record)
                continue

            message = ReceivedMessage(
                topic=record.topic,
                partition=record.partition,
                offset=record.offset,
                key=record.key.decode("utf-8") if record.key else None,
                headers={
                    key: value.decode("utf-8")
                    for key, value in (record.headers or [])
                },
                payload=payload,
            )
            try:
                decision = await handler(message)
            except Exception as exc:  # noqa: BLE001 - infrastructure must retain the offset.
                logger.emit_event(
                    LogLevel.ERROR,
                    message=(
                        "Kafka 消息处理器异常 "
                        f"{record.topic}[{record.partition}]@{record.offset}: {exc}"
                    ),
                )
                decision = SubscriberDecision.RETRY

            if decision == SubscriberDecision.ACK:
                await self._consumer.commit(record)
                continue

            self._consumer.retry(record)
            await asyncio.sleep(self._retry_delay_seconds)
