"""HTTP client shared by synchronous AI endpoints and asynchronous workers."""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from app.core.config import settings


class AiModelRequestError(RuntimeError):
    """A normalized model-service error."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 502,
        detail: Any | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.detail = message if detail is None else detail

    @property
    def transient(self) -> bool:
        return self.status_code in {408, 429, 502, 503, 504}


class AiModelClient:
    """Reusable async client for AP/LAT object-based measurement APIs."""

    def __init__(
        self,
        *,
        timeout: float | None = None,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._timeout = timeout or settings.AI_MODEL_TIMEOUT
        self._transport = transport
        self._client: httpx.AsyncClient | None = None
        self._lock = asyncio.Lock()

    async def start(self) -> None:
        async with self._lock:
            if self._client is not None and not self._client.is_closed:
                return
            self._client = httpx.AsyncClient(
                timeout=self._timeout,
                transport=self._transport,
            )

    async def stop(self) -> None:
        async with self._lock:
            client = self._client
            self._client = None
            if client is not None and not client.is_closed:
                await client.aclose()

    @staticmethod
    def object_payload(image: Any) -> dict[str, str]:
        return {
            "bucket": image.storage_bucket,
            "object_key": image.object_key,
            "image_id": f"IMG{image.id}",
        }

    @staticmethod
    def measurement_url(image: Any) -> str:
        url = (
            settings.AI_LAT_MEASUREMENT_OBJECT_URL
            if image.description == "侧位X光片"
            else settings.AI_AP_MEASUREMENT_OBJECT_URL
        )
        if not url:
            raise AiModelRequestError("AI模型 object 接口未配置", status_code=503)
        return url

    async def post(self, url: str, payload: dict[str, str]) -> dict[str, Any]:
        await self.start()
        assert self._client is not None
        try:
            response = await self._client.post(url, json=payload)
        except httpx.HTTPError as exc:
            raise AiModelRequestError(f"AI模型服务不可用: {exc}", status_code=502) from exc

        if response.status_code >= 400:
            try:
                detail = response.json()
            except ValueError:
                detail = response.text
            raise AiModelRequestError(
                str(detail),
                status_code=response.status_code,
                detail=detail,
            )

        try:
            response_payload = response.json()
        except ValueError as exc:
            raise AiModelRequestError("AI模型响应格式错误", status_code=502) from exc
        if not isinstance(response_payload, dict):
            raise AiModelRequestError("AI模型响应格式错误", status_code=502)
        return response_payload

    async def predict(self, image: Any) -> dict[str, Any]:
        return await self.post(
            self.measurement_url(image),
            self.object_payload(image),
        )


ai_model_client = AiModelClient()
