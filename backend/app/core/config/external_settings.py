"""External service configuration."""

from __future__ import annotations

from typing import Optional

from .base import BaseAppSettings


class ExternalSettings(BaseAppSettings):
    """Settings for Sentry and optional cloud storage providers."""

    SENTRY_DSN: Optional[str] = None

    CLOUD_STORAGE_TYPE: Optional[str] = None
    CLOUD_STORAGE_BUCKET: Optional[str] = None
    CLOUD_STORAGE_ACCESS_KEY: Optional[str] = None
    CLOUD_STORAGE_SECRET_KEY: Optional[str] = None
    CLOUD_STORAGE_REGION: Optional[str] = None


external_settings = ExternalSettings()
