"""Application-level concurrency limit configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class ConcurrencySettings(BaseAppSettings):
    """Settings for per-worker concurrency gates around heavy endpoints."""

    AI_OBJECT_CONCURRENCY_LIMIT: int = 50
    BATCH_PRESIGN_CONCURRENCY_LIMIT: int = 100
    LEGACY_DIAGNOSIS_CONCURRENCY_LIMIT: int = 100
    REPORT_EXPORT_CONCURRENCY_LIMIT: int = 100


concurrency_settings = ConcurrencySettings()
