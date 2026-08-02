"""AI 影像测量端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.domain import JsonObject
from app.models.image_file import ImageFile


class AiMeasurementGateway(Protocol):
    async def predict(self, image: ImageFile) -> JsonObject: ...
