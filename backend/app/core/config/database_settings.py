"""Database configuration."""

from __future__ import annotations

import os
from urllib.parse import quote_plus

from .base import BaseAppSettings


class DatabaseSettings(BaseAppSettings):
    """Settings for MySQL and SQLAlchemy connection pooling."""

    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3307
    DB_USER: str = "medical_user"
    DB_PASSWORD: str = "medical_password_2024"
    DB_NAME: str = "medical_imaging_system"

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600

    @property
    def MYSQL_HOST(self) -> str:
        """Return the DB host through the legacy MySQL alias."""
        return self.DB_HOST

    @property
    def MYSQL_PORT(self) -> int:
        """Return the DB port through the legacy MySQL alias."""
        return self.DB_PORT

    @property
    def MYSQL_USER(self) -> str:
        """Return the DB user through the legacy MySQL alias."""
        return self.DB_USER

    @property
    def MYSQL_PASSWORD(self) -> str:
        """Return the DB password through the legacy MySQL alias."""
        return self.DB_PASSWORD

    @property
    def MYSQL_DATABASE(self) -> str:
        """Return the DB name through the legacy MySQL alias."""
        return self.DB_NAME

    @property
    def DATABASE_URL(self) -> str:
        """Build the SQLAlchemy database URL."""
        env_url = os.getenv("DATABASE_URL")
        if env_url:
            url = env_url
            if url.startswith("mysql://"):
                url = url.replace("mysql://", "mysql+pymysql://", 1)
            if "?" not in url:
                url += "?charset=utf8mb4"
            return url

        encoded_user = quote_plus(self.DB_USER)
        encoded_password = quote_plus(self.DB_PASSWORD)
        return (
            f"mysql+pymysql://{encoded_user}:{encoded_password}"
            f"@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
        )

    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """Build the SQLAlchemy async database URL."""
        env_url = os.getenv("ASYNC_DATABASE_URL")
        if env_url:
            url = env_url
        else:
            url = self.DATABASE_URL

        if url.startswith("mysql+pymysql://"):
            url = url.replace("mysql+pymysql://", "mysql+asyncmy://", 1)
        elif url.startswith("mysql://"):
            url = url.replace("mysql://", "mysql+asyncmy://", 1)
        if "?" not in url:
            url += "?charset=utf8mb4"
        return url


database_settings = DatabaseSettings()
