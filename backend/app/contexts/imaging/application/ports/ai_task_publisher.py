"""AI 任务事件发布端口。"""

from typing import Protocol

from app.contexts.imaging.application.dto import AiTaskEvent


class AiTaskPublisher(Protocol):
    async def publish(self, event: AiTaskEvent) -> None: ...
