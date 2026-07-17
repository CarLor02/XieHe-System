"""Transport-independent message subscription contract."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Any, Awaitable, Callable, Mapping, Protocol


@dataclass(frozen=True)
class ReceivedMessage:
    """Decoded broker message delivered to an application handler."""

    topic: str
    partition: int
    offset: int
    payload: Mapping[str, Any]
    key: str | None = None
    headers: Mapping[str, str] | None = None


class SubscriberDecision(str, Enum):
    """Whether the broker offset may advance after application processing."""

    ACK = "ACK"
    RETRY = "RETRY"


MessageHandler = Callable[[ReceivedMessage], Awaitable[SubscriberDecision]]


class Subscriber(Protocol):
    """Application-facing subscription runner."""

    async def start(self) -> None:
        """Allocate transport resources."""

    async def stop(self) -> None:
        """Release transport resources."""

    async def run(self, handler: MessageHandler) -> None:
        """Consume messages until stopped."""
