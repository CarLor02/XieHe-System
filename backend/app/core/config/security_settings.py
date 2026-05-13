"""Security, JWT, and password configuration."""

from __future__ import annotations

import secrets

from .base import BaseAppSettings


class SecuritySettings(BaseAppSettings):
    """Settings for secrets, JWT tokens, and password policy."""

    SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_HASH_ROUNDS: int = 12


security_settings = SecuritySettings()
