"""Low-level Kafka consumer lifecycle and offset control."""

from __future__ import annotations

from collections.abc import Iterable

from aiokafka import AIOKafkaConsumer
from aiokafka.structs import ConsumerRecord, TopicPartition


class KafkaConsumer:
    """Thin record-oriented wrapper over aiokafka's consumer."""

    def __init__(
        self,
        *,
        topics: Iterable[str],
        bootstrap_servers: str | Iterable[str],
        group_id: str,
        client_id: str,
    ) -> None:
        self._topics = tuple(topics)
        self._consumer = AIOKafkaConsumer(
            *self._topics,
            bootstrap_servers=bootstrap_servers,
            group_id=group_id,
            client_id=client_id,
            enable_auto_commit=False,
            auto_offset_reset="earliest",
        )
        self._started = False

    async def start(self) -> None:
        if self._started:
            return
        await self._consumer.start()
        self._started = True

    async def stop(self) -> None:
        if not self._started:
            return
        self._started = False
        await self._consumer.stop()

    async def getone(self) -> ConsumerRecord:
        if not self._started:
            await self.start()
        return await self._consumer.getone()

    async def commit(self, record: ConsumerRecord) -> None:
        partition = TopicPartition(record.topic, record.partition)
        await self._consumer.commit({partition: record.offset + 1})

    def retry(self, record: ConsumerRecord) -> None:
        partition = TopicPartition(record.topic, record.partition)
        self._consumer.seek(partition, record.offset)
