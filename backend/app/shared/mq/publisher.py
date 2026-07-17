"""Transport-independent message publishing contract."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Mapping, Protocol


@dataclass(frozen=True)
class PublishMessage:
    """Serializable message passed from an application use case to a broker."""

    topic: str
    payload: Mapping[str, Any]
    key: str | None = None
    headers: Mapping[str, str] = field(default_factory=dict)


class Publisher(Protocol):
    """Application-facing asynchronous publisher."""

    async def start(self) -> None:
        """Allocate transport resources."""

    async def stop(self) -> None:
        """Release transport resources."""

    async def publish(self, message: PublishMessage) -> None:
        """Publish one message or raise when the broker did not accept it."""
