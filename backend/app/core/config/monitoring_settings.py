"""Monitoring and health check configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class MonitoringSettings(BaseAppSettings):
    """Settings for metrics and health checks."""

    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    HEALTH_CHECK_INTERVAL: int = 30
    HEALTH_CHECK_TIMEOUT: int = 10


monitoring_settings = MonitoringSettings()
