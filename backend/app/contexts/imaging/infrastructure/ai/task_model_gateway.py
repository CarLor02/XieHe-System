"""AI task model adapter for the application processor."""

from typing import Any

from app.contexts.imaging.application.dto import AiImageReference
from app.contexts.imaging.application.errors import AiTaskModelError

from .client import AiModelClient, AiModelRequestError


class AiTaskHttpModelGateway:
    def __init__(self, client: AiModelClient) -> None:
        self.client = client

    async def predict(self, image: AiImageReference) -> dict[str, Any]:
        try:
            return await self.client.predict(image)
        except AiModelRequestError as exc:
            raise AiTaskModelError(str(exc), transient=exc.transient) from exc

    async def stop(self) -> None:
        await self.client.stop()
