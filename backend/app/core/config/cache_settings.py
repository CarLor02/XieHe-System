"""Application cache configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class CacheSettings(BaseAppSettings):
    """Settings for disposable query-result caching."""

    CACHE_ENABLED: bool = True
    REDIS_CACHE_URL: str = "redis://127.0.0.1:6381/0"
    # aiocache RedisCache inserts the separator between namespace and key.
    CACHE_NAMESPACE: str = "xiehe:cache:v1"
    CACHE_OPERATION_TIMEOUT_SECONDS: float = 1.0
    CACHE_POOL_SIZE: int = 20
    PATIENT_LIST_CACHE_TTL_SECONDS: int = 60
    PATIENT_DETAIL_CACHE_TTL_SECONDS: int = 300


cache_settings = CacheSettings()
