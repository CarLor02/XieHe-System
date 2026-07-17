"""Low-level Kafka producer lifecycle and byte transport."""

from __future__ import annotations

from collections.abc import Iterable

from aiokafka import AIOKafkaProducer


class KafkaProducer:
    """Thin byte-oriented wrapper over aiokafka's producer."""

    def __init__(self, bootstrap_servers: str | Iterable[str]) -> None:
        self._bootstrap_servers = bootstrap_servers
        self._producer: AIOKafkaProducer | None = None

    async def start(self) -> None:
        if self._producer is not None:
            return
        producer = AIOKafkaProducer(
            bootstrap_servers=self._bootstrap_servers,
            acks="all",
            enable_idempotence=True,
        )
        await producer.start()
        self._producer = producer

    async def stop(self) -> None:
        producer = self._producer
        self._producer = None
        if producer is not None:
            await producer.stop()

    async def send(
        self,
        *,
        topic: str,
        value: bytes,
        key: bytes | None = None,
        headers: list[tuple[str, bytes]] | None = None,
    ) -> None:
        if self._producer is None:
            await self.start()
        assert self._producer is not None
        await self._producer.send_and_wait(
            topic,
            value=value,
            key=key,
            headers=headers,
        )
