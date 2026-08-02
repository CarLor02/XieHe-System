"""AI 模型 HTTP client 到测量端口的适配。"""

from __future__ import annotations

from typing import cast

import httpx

from app.contexts.imaging.application.errors import AiMeasurementUnavailableError
from app.contexts.imaging.domain import JsonObject
from app.models.image_file import ImageFile
from app.services.ai_model_client import (
    AiModelClient,
    AiModelRequestError,
    ai_model_client,
)

_client = ai_model_client


class AiModelMeasurementGateway:
    async def predict(self, image: ImageFile) -> JsonObject:
        try:
            url = AiModelClient.measurement_url(image)
            payload = AiModelClient.object_payload(image)
            return cast(JsonObject, await _client.post(url, payload))
        except AiModelRequestError as exc:
            raise AiMeasurementUnavailableError(
                str(exc.detail),
                status_code=exc.status_code,
            ) from exc


async def start_ai_measurement_client(
    async_transport: httpx.AsyncBaseTransport | None = None,
) -> None:
    global _client
    if async_transport is not None:
        await _client.stop()
        _client = AiModelClient(transport=async_transport)
    await _client.start()


async def stop_ai_measurement_client() -> None:
    await _client.stop()
