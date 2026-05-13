"""Application and HTTP server configuration."""

from __future__ import annotations

from typing import List, Union

from pydantic import validator

from .base import BaseAppSettings


class AppSettings(BaseAppSettings):
    """Settings for application metadata, runtime mode, and HTTP boundaries."""

    PROJECT_NAME: str = "医疗影像诊断系统"
    PROJECT_DESCRIPTION: str = "基于AI的医疗影像诊断系统，支持DICOM影像处理、智能诊断、报告生成等功能"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"

    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    HOST: str = "0.0.0.0"
    PORT: int = 8000

    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "http://localhost:3000/",
        "http://127.0.0.1:3000/",
        "https://localhost:3000/",
        "https://38.60.251.79",
        "http://38.60.251.79",
        "*",
    ]
    ALLOWED_HOSTS: List[str] = ["*"]

    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, value: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated CORS origins from environment variables."""
        if isinstance(value, str) and not value.startswith("["):
            return [origin.strip() for origin in value.split(",")]
        if isinstance(value, list):
            return [str(origin) for origin in value]
        if isinstance(value, str):
            return [value]
        raise ValueError(value)

    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_allowed_hosts(cls, value: Union[str, List[str]]) -> List[str]:
        """Parse comma-separated trusted hosts from environment variables."""
        if isinstance(value, str) and not value.startswith("["):
            return [host.strip() for host in value.split(",")]
        if isinstance(value, list):
            return [str(host) for host in value]
        if isinstance(value, str):
            return [value]
        raise ValueError(value)


app_settings = AppSettings()
