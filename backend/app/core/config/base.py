"""Shared configuration base classes and environment file settings."""

from __future__ import annotations

from pydantic_settings import BaseSettings


ENV_FILE_PATHS = (
    ".env",
    "dotenv/.env.runtime",
    "dotenv/.env.database",
    "dotenv/.env.redis",
    "dotenv/.env.minio",
    "dotenv/.env.storage",
    "dotenv/.env.logging",
    "dotenv/.env.concurrency",
    "dotenv/.env.backend",
    "../dotenv/.env.runtime",
    "../dotenv/.env.database",
    "../dotenv/.env.redis",
    "../dotenv/.env.minio",
    "../dotenv/.env.storage",
    "../dotenv/.env.logging",
    "../dotenv/.env.concurrency",
    "../dotenv/.env.backend",
)


class BaseAppSettings(BaseSettings):
    """Base settings class shared by every configuration domain."""

    class Config:
        """Pydantic settings configuration."""

        env_file = ENV_FILE_PATHS
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"
