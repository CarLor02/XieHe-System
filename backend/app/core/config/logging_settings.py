"""Local and internal logging-service configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class LoggingSettings(BaseAppSettings):
    """Settings for local logs and the Go logging-service client."""

    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/app.log"
    LOG_MAX_SIZE: str = "10MB"
    LOG_BACKUP_COUNT: int = 5

    LOGGING_SERVICE_URL: str = "http://logging-service:8091"
    LOGGING_SERVICE_TOKEN: str = "dev-logging-service-token"
    LOGGING_SERVICE_TIMEOUT: float = 2.0


logging_settings = LoggingSettings()
