"""HTTP adapter for model health checks and test inference."""

from __future__ import annotations

import base64
from typing import Any, cast

import httpx

from app.contexts.model_management.application.ports import ModelTestFile
from app.contexts.model_management.domain import ModelStatus
from app.core.system.logger import LogLevel, logger


class HttpModelRuntimeGateway:
    async def check_health(self, endpoint_url: str) -> ModelStatus:
        base_url = endpoint_url.rstrip("/")
        for suffix in ("/api/measurement", "/predict"):
            if base_url.endswith(suffix):
                base_url = base_url[: -len(suffix)]
                break
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{base_url}/health")
            if response.status_code != 200:
                return ModelStatus.ERROR
            payload = response.json()
            return (
                ModelStatus.READY
                if isinstance(payload, dict)
                and payload.get("status") in {"ok", "healthy"}
                else ModelStatus.ERROR
            )
        except Exception as exc:
            logger.emit_event(
                LogLevel.WARNING,
                message=f"模型健康检查失败: {endpoint_url}: {exc}",
            )
            return ModelStatus.STOPPED

    async def test(
        self, endpoint_url: str, files: tuple[ModelTestFile, ...]
    ) -> dict[str, Any]:
        # 历史 models.json 允许 mock URL，保留该兼容分支供离线 UI 联调。
        if "mock" in endpoint_url.lower():
            return {
                "success": True,
                "result_image": "https://via.placeholder.com/512?text=Processed+Result",
            }

        multipart = [
            ("files", (filename, content, content_type))
            for filename, content, content_type in files
        ]
        async with httpx.AsyncClient() as client:
            response = await client.post(
                endpoint_url,
                files=cast(Any, multipart),
                timeout=30.0,
            )
        if response.status_code != 200:
            raise RuntimeError(f"External API error: {response.text}")
        content_type = response.headers.get("content-type", "")
        if "image" in content_type:
            encoded = base64.b64encode(response.content).decode("utf-8")
            return {
                "success": True,
                "result_image": f"data:{content_type};base64,{encoded}",
            }
        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("Model response must be a JSON object")
        return cast(dict[str, Any], payload)
