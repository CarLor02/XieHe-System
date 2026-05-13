"""Application cache configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class CacheSettings(BaseAppSettings):
    """Settings for cache and session expiration."""

    CACHE_EXPIRE_TIME: int = 3600
    SESSION_EXPIRE_TIME: int = 86400


cache_settings = CacheSettings()
