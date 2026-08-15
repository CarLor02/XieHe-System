"""缩略图任务发布端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import ThumbnailTaskEvent


class ThumbnailTaskPublisher(Protocol):
    async def publish(self, event: ThumbnailTaskEvent) -> None: ...
