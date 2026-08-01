"""Redis configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class RedisSettings(BaseAppSettings):
    """Settings for durable security state and distributed coordination."""

    REDIS_STATE_URL: str = "redis://127.0.0.1:6380/0"
    REDIS_TIMEOUT: int = 5
    REDIS_STATE_POOL_SIZE: int = 20


redis_settings = RedisSettings()
