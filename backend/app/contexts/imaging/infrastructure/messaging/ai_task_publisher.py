"""现有 Kafka publisher 到影像任务发布端口的适配。"""

from dataclasses import asdict

from app.contexts.imaging.application.dto import AiTaskEvent
from app.services.ai_task_queue import publish_ai_task_event


class KafkaAiTaskPublisher:
    async def publish(self, event: AiTaskEvent) -> None:
        await publish_ai_task_event(asdict(event))
