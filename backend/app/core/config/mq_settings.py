"""Message queue configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class MqSettings(BaseAppSettings):
    """Kafka settings used by batch image AI tasks."""

    KAFKA_BOOTSTRAP_SERVERS: str = "kafka:9092"
    AI_TASK_KAFKA_TOPIC: str = "medical.image-ai.predict.v1"
    AI_TASK_KAFKA_GROUP_ID: str = "medical-image-ai-worker-v1"
    AI_TASK_KAFKA_PARTITIONS: int = 4
    AI_WORKER_CONCURRENCY: int = 2
    THUMBNAIL_TASK_KAFKA_TOPIC: str = "medical.image-thumbnail.generate.v1"
    THUMBNAIL_TASK_KAFKA_GROUP_ID: str = "medical-image-thumbnail-worker-v1"
    THUMBNAIL_TASK_KAFKA_PARTITIONS: int = 2
    THUMBNAIL_WORKER_CONCURRENCY: int = 2
    THUMBNAIL_MAX_RETRIES: int = 5
    THUMBNAIL_REQUEUE_INTERVAL_SECONDS: int = 60
    THUMBNAIL_PROCESSING_LEASE_SECONDS: int = 300
    BATCH_IMPORT_MAX_FILES: int = 200


mq_settings = MqSettings()
