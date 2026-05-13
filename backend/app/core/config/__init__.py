"""Configuration entrypoint and registry."""

from __future__ import annotations

from collections import OrderedDict
from typing import Any, Iterator

from .ai_settings import AiSettings, ai_settings
from .app_settings import AppSettings, app_settings
from .cache_settings import CacheSettings, cache_settings
from .database_settings import DatabaseSettings, database_settings
from .development_settings import DevelopmentSettings, development_settings
from .email_settings import EmailSettings, email_settings
from .external_settings import ExternalSettings, external_settings
from .logging_settings import LoggingSettings, logging_settings
from .monitoring_settings import MonitoringSettings, monitoring_settings
from .redis_settings import RedisSettings, redis_settings
from .security_settings import SecuritySettings, security_settings
from .storage_settings import StorageSettings, storage_settings


CONFIG_REGISTRY = OrderedDict(
    [
        ("app", app_settings),
        ("security", security_settings),
        ("database", database_settings),
        ("redis", redis_settings),
        ("storage", storage_settings),
        ("email", email_settings),
        ("logging", logging_settings),
        ("ai", ai_settings),
        ("cache", cache_settings),
        ("monitoring", monitoring_settings),
        ("external", external_settings),
        ("development", development_settings),
    ]
)


class Settings:
    """Flat compatibility facade over registered settings domains."""

    def __init__(self, registry: OrderedDict[str, Any] | None = None) -> None:
        """Create a settings facade from the registered domain instances."""
        self._registry = registry or CONFIG_REGISTRY

    def __getattr__(self, name: str) -> Any:
        """Resolve a setting by scanning registered domains in order."""
        for domain_settings in self._registry.values():
            if hasattr(domain_settings, name):
                return getattr(domain_settings, name)
        raise AttributeError(f"{type(self).__name__!s} has no setting {name!r}")

    def iter_domains(self) -> Iterator[tuple[str, Any]]:
        """Yield registered settings domains in lookup order."""
        return iter(self._registry.items())


settings = Settings()

__all__ = [
    "AiSettings",
    "AppSettings",
    "CacheSettings",
    "CONFIG_REGISTRY",
    "DatabaseSettings",
    "DevelopmentSettings",
    "EmailSettings",
    "ExternalSettings",
    "LoggingSettings",
    "MonitoringSettings",
    "RedisSettings",
    "SecuritySettings",
    "Settings",
    "StorageSettings",
    "ai_settings",
    "app_settings",
    "cache_settings",
    "database_settings",
    "development_settings",
    "email_settings",
    "external_settings",
    "logging_settings",
    "monitoring_settings",
    "redis_settings",
    "security_settings",
    "settings",
    "storage_settings",
]
