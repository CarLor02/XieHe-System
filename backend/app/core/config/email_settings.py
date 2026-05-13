"""Email configuration."""

from __future__ import annotations

from typing import Optional

from pydantic import EmailStr

from .base import BaseAppSettings


class EmailSettings(BaseAppSettings):
    """Settings for SMTP and system email sender identity."""

    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True

    FROM_EMAIL: Optional[EmailStr] = None
    FROM_NAME: str = "医疗影像诊断系统"


email_settings = EmailSettings()
