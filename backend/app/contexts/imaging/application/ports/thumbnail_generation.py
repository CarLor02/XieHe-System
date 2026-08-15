"""缩略图对象读取、转换和写入端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import (
    ThumbnailGenerationResult,
    ThumbnailGenerationSource,
)


class ThumbnailGenerationGateway(Protocol):
    async def generate(
        self, source: ThumbnailGenerationSource
    ) -> ThumbnailGenerationResult: ...

    async def delete(self, *, bucket: str, object_key: str) -> None: ...
