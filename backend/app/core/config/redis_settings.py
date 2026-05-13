"""Redis configuration."""

from __future__ import annotations

import os
from typing import Optional

from .base import BaseAppSettings


class RedisSettings(BaseAppSettings):
    """Settings for Redis cache and session storage."""

    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6380
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_TIMEOUT: int = 5

    @property
    def REDIS_URL(self) -> str:
        """Build the Redis connection URL."""
        env_url = os.getenv("REDIS_URL")
        if env_url:
            return env_url
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"


redis_settings = RedisSettings()
