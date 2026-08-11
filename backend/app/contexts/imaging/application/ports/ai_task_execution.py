"""Ports used by asynchronous AI task processing."""

from typing import Any, Protocol

from app.contexts.imaging.application.dto import AiImageReference, AiTaskEvent


class AiTaskExecutionRepository(Protocol):
    def claim(self, event: AiTaskEvent) -> AiImageReference | None: ...

    def mark_success(self, event: AiTaskEvent, response: dict[str, Any]) -> None: ...

    def mark_retry(self, event: AiTaskEvent, error: str) -> None: ...

    def mark_failed(self, event: AiTaskEvent, error: str) -> None: ...


class AiTaskModelGateway(Protocol):
    async def predict(self, image: AiImageReference) -> dict[str, Any]: ...
