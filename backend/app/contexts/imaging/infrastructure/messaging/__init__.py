"""影像消息发布适配器。"""

from .ai_task_publisher import (
    KafkaAiTaskPublisher,
    get_ai_task_publisher,
    set_ai_task_publisher,
    start_ai_task_publisher,
    stop_ai_task_publisher,
)
from .thumbnail_task_publisher import (
    KafkaThumbnailTaskPublisher,
    get_thumbnail_task_publisher,
    set_thumbnail_task_publisher,
    start_thumbnail_task_publisher,
    stop_thumbnail_task_publisher,
)

__all__ = [
    "KafkaAiTaskPublisher",
    "get_ai_task_publisher",
    "set_ai_task_publisher",
    "start_ai_task_publisher",
    "stop_ai_task_publisher",
    "KafkaThumbnailTaskPublisher",
    "get_thumbnail_task_publisher",
    "set_thumbnail_task_publisher",
    "start_thumbnail_task_publisher",
    "stop_thumbnail_task_publisher",
]
