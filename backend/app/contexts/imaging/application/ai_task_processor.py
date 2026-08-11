"""Application flow for one Kafka-backed AI measurement task."""

import asyncio
from collections.abc import Awaitable, Callable
from typing import Any, Literal

from app.contexts.imaging.application.dto import (
    AiImageReference,
    AiTaskEvent,
)
from app.contexts.imaging.application.errors import AiTaskModelError
from app.contexts.imaging.application.ports import (
    AiTaskExecutionRepository,
    AiTaskModelGateway,
)

AiTaskProcessingOutcome = Literal["ack", "retry"]


class AiTaskProcessor:
    def __init__(
        self,
        repository: AiTaskExecutionRepository,
        model: AiTaskModelGateway,
        *,
        max_retries: int,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self._repository = repository
        self._model = model
        self._max_retries = max(1, max_retries)
        self._sleep = sleep

    @staticmethod
    def parse_event(payload: dict[str, Any]) -> AiTaskEvent:
        if payload.get("event_type") != "image.ai.predict.requested":
            raise ValueError("unsupported event type")
        if payload.get("version") != 1:
            raise ValueError("unsupported event version")
        return AiTaskEvent(
            event_type="image.ai.predict.requested",
            version=1,
            task_id=str(payload["task_id"]),
            batch_id=str(payload["batch_id"]),
            batch_item_id=int(payload["batch_item_id"]),
            image_file_id=int(payload["image_file_id"]),
            requested_by=int(payload["requested_by"]),
        )

    async def process(self, payload: dict[str, Any]) -> AiTaskProcessingOutcome:
        try:
            event = self.parse_event(payload)
        except (KeyError, TypeError, ValueError):
            return "ack"
        image = self._repository.claim(event)
        if image is None:
            return "ack"
        try:
            response = await self.predict_with_retries(image)
        except AiTaskModelError as exc:
            if exc.transient:
                self._repository.mark_retry(event, str(exc))
                return "retry"
            self._repository.mark_failed(event, str(exc))
            return "ack"
        except Exception as exc:
            self._repository.mark_retry(event, str(exc))
            return "retry"
        self._repository.mark_success(event, response)
        return "ack"

    async def predict_with_retries(self, image: AiImageReference) -> dict[str, Any]:
        last_error: AiTaskModelError | None = None
        for attempt in range(self._max_retries):
            try:
                return await self._model.predict(image)
            except AiTaskModelError as exc:
                last_error = exc
                if not exc.transient or attempt + 1 >= self._max_retries:
                    raise
                await self._sleep(min(2**attempt, 5))
        assert last_error is not None
        raise last_error
