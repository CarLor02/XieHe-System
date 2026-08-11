"""AI 影像测量端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.domain import JsonObject

from .records import ImageFileRecord


class AiMeasurementGateway(Protocol):
    async def predict(self, image: ImageFileRecord) -> JsonObject: ...
