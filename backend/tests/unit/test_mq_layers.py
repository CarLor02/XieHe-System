import json
from types import SimpleNamespace

import pytest

from app.shared.mq.kafka.publisher import KafkaPublisher
from app.shared.mq.kafka.subscriber import KafkaSubscriber
from app.shared.mq.publisher import PublishMessage
from app.shared.mq.subscriber import SubscriberDecision


class FakeProducer:
    def __init__(self) -> None:
        self.started = False
        self.sent = []

    async def start(self) -> None:
        self.started = True

    async def stop(self) -> None:
        self.started = False

    async def send(self, **kwargs) -> None:
        self.sent.append(kwargs)


@pytest.mark.asyncio
async def test_kafka_publisher_serializes_application_message() -> None:
    producer = FakeProducer()
    publisher = KafkaPublisher(producer)

    await publisher.publish(
        PublishMessage(
            topic="image-ai",
            key="42",
            payload={"event_type": "image.ai.predict.requested", "version": 1},
            headers={"trace-id": "abc"},
        )
    )

    sent = producer.sent[0]
    assert sent["topic"] == "image-ai"
    assert sent["key"] == b"42"
    assert json.loads(sent["value"])["version"] == 1
    assert sent["headers"] == [("trace-id", b"abc")]


class FakeConsumer:
    def __init__(self, records) -> None:
        self.records = iter(records)
        self.committed = []
        self.retried = []

    async def start(self) -> None:
        return None

    async def stop(self) -> None:
        return None

    async def getone(self):
        try:
            return next(self.records)
        except StopIteration as exc:
            raise RuntimeError("done") from exc

    async def commit(self, record) -> None:
        self.committed.append(record.offset)

    def retry(self, record) -> None:
        self.retried.append(record.offset)


@pytest.mark.asyncio
async def test_kafka_subscriber_commits_malformed_message() -> None:
    record = SimpleNamespace(
        topic="image-ai",
        partition=0,
        offset=7,
        key=None,
        value=b"not-json",
        headers=[],
    )
    consumer = FakeConsumer([record])
    subscriber = KafkaSubscriber(consumer)

    async def handler(_message):
        return SubscriberDecision.ACK

    with pytest.raises(RuntimeError, match="done"):
        await subscriber.run(handler)

    assert consumer.committed == [7]
