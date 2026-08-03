"""External model runtime port."""

from typing import Any, Protocol

from app.contexts.model_management.domain import ModelStatus

ModelTestFile = tuple[str, bytes, str | None]


class ModelRuntimeGateway(Protocol):
    async def check_health(self, endpoint_url: str) -> ModelStatus: ...

    async def test(
        self, endpoint_url: str, files: tuple[ModelTestFile, ...]
    ) -> dict[str, Any]: ...
