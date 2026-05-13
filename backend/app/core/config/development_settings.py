"""Development and test-time configuration."""

from __future__ import annotations

from .base import BaseAppSettings


class DevelopmentSettings(BaseAppSettings):
    """Settings used for development, profiling, and test startup behavior."""

    DEVELOPMENT_MODE: bool = True
    DEBUG_SQL: bool = False
    ENABLE_PROFILING: bool = False
    RUN_MIGRATIONS: bool = True


development_settings = DevelopmentSettings()
