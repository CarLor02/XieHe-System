import pytest

from app.core.config import (
    CONFIG_REGISTRY,
    AppSettings,
    DatabaseSettings,
    RedisSettings,
    database_settings,
    logging_settings,
    settings,
)


def test_settings_facade_exposes_registered_domain_fields() -> None:
    assert settings.DB_HOST == database_settings.DB_HOST
    assert settings.LOGGING_SERVICE_URL == logging_settings.LOGGING_SERVICE_URL
    assert settings.PROJECT_NAME == "医疗影像诊断系统"


def test_config_registry_contains_expected_domains() -> None:
    assert list(CONFIG_REGISTRY.keys()) == [
        "app",
        "security",
        "database",
        "redis",
        "storage",
        "email",
        "logging",
        "ai",
        "cache",
        "concurrency",
        "monitoring",
        "mq",
        "external",
        "development",
    ]


def test_database_url_uses_environment_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("DATABASE_URL", "mysql://user:pass@db:3306/app")

    assert DatabaseSettings().DATABASE_URL == "mysql+pymysql://user:pass@db:3306/app?charset=utf8mb4"
    assert DatabaseSettings().ASYNC_DATABASE_URL == "mysql+asyncmy://user:pass@db:3306/app?charset=utf8mb4"


def test_database_settings_keep_mysql_aliases(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("ASYNC_DATABASE_URL", raising=False)
    database_settings = DatabaseSettings(
        DB_HOST="db",
        DB_PORT=3306,
        DB_USER="user",
        DB_PASSWORD="pass",
        DB_NAME="medical",
    )

    assert database_settings.MYSQL_HOST == "db"
    assert database_settings.MYSQL_PORT == 3306
    assert database_settings.MYSQL_USER == "user"
    assert database_settings.MYSQL_PASSWORD == "pass"
    assert database_settings.MYSQL_DATABASE == "medical"
    assert database_settings.ASYNC_DATABASE_URL == "mysql+asyncmy://user:pass@db:3306/medical?charset=utf8mb4"


def test_redis_url_uses_environment_override(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("REDIS_URL", "redis://redis:6379/2")

    assert RedisSettings().REDIS_URL == "redis://redis:6379/2"


def test_app_settings_parse_comma_separated_lists() -> None:
    app_settings = AppSettings(
        BACKEND_CORS_ORIGINS="http://a.example,http://b.example",
        ALLOWED_HOSTS="a.example,b.example",
    )

    assert app_settings.BACKEND_CORS_ORIGINS == ["http://a.example", "http://b.example"]
    assert app_settings.ALLOWED_HOSTS == ["a.example", "b.example"]


def test_app_settings_parse_comma_separated_lists_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BACKEND_CORS_ORIGINS", "http://a.example,http://b.example")
    monkeypatch.setenv("ALLOWED_HOSTS", "a.example,b.example")

    app_settings = AppSettings()

    assert app_settings.BACKEND_CORS_ORIGINS == ["http://a.example", "http://b.example"]
    assert app_settings.ALLOWED_HOSTS == ["a.example", "b.example"]
