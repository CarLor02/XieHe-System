"""Shared MySQL test database utilities.

The helpers in this module are intentionally guarded so cleanup can only run
against the dedicated test database.
"""

from __future__ import annotations

import os
import sys
from functools import lru_cache
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine, URL, make_url
from sqlalchemy.orm import sessionmaker


BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

TEST_DATABASE_NAME = "medical_imaging_system_test"
TEST_DATABASE_COLLATION = "utf8mb4_0900_ai_ci"
TEST_DATABASE_CHARSET = "utf8mb4"


def _running_in_container() -> bool:
    return Path("/.dockerenv").exists()


def _render_url(url: URL) -> str:
    return url.render_as_string(hide_password=False)


def _quote_identifier(identifier: str) -> str:
    return f"`{identifier.replace('`', '``')}`"


def _base_database_url() -> URL:
    raw_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")

    if raw_url is None:
        from app.core.config import settings

        raw_url = settings.DATABASE_URL

    url = make_url(raw_url)
    if os.getenv("TEST_DATABASE_URL"):
        return url

    if url.host == "mysql" and not _running_in_container():
        url = url.set(host="127.0.0.1")

    return url.set(database=TEST_DATABASE_NAME)


def get_test_database_url() -> str:
    url = _base_database_url()
    if url.get_backend_name() not in {"mysql", "mariadb"}:
        raise RuntimeError("Backend tests require a MySQL-compatible TEST_DATABASE_URL.")
    if url.database != TEST_DATABASE_NAME:
        raise RuntimeError(
            f"TEST_DATABASE_URL must point to {TEST_DATABASE_NAME!r}; got {url.database!r}."
        )
    return _render_url(url)


def _assert_test_database(url: URL) -> None:
    if url.database != TEST_DATABASE_NAME:
        raise RuntimeError(
            f"Refusing to operate on database {url.database!r}; expected {TEST_DATABASE_NAME!r}."
        )


def ensure_test_database_exists() -> None:
    url = make_url(get_test_database_url())
    _assert_test_database(url)
    server_url = url.set(database="")

    engine = create_engine(_render_url(server_url), pool_pre_ping=True, future=True)
    try:
        with engine.connect() as connection:
            connection.execute(
                text(
                    f"CREATE DATABASE IF NOT EXISTS {_quote_identifier(TEST_DATABASE_NAME)} "
                    f"CHARACTER SET {TEST_DATABASE_CHARSET} "
                    f"COLLATE {TEST_DATABASE_COLLATION}"
                )
            )
            connection.commit()
    finally:
        engine.dispose()


def upgrade_test_database() -> None:
    previous_database_url = os.environ.get("DATABASE_URL")
    os.environ["DATABASE_URL"] = get_test_database_url()

    try:
        alembic_config = Config(str(BACKEND_ROOT / "alembic.ini"))
        command.upgrade(alembic_config, "head")
    finally:
        if previous_database_url is None:
            os.environ.pop("DATABASE_URL", None)
        else:
            os.environ["DATABASE_URL"] = previous_database_url


@lru_cache(maxsize=1)
def get_test_engine() -> Engine:
    return create_engine(get_test_database_url(), pool_pre_ping=True, future=True)


@lru_cache(maxsize=1)
def get_test_sessionmaker() -> sessionmaker:
    return sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=get_test_engine(),
        expire_on_commit=False,
    )


def truncate_test_database(engine: Engine | None = None) -> None:
    engine = engine or get_test_engine()
    url = make_url(str(engine.url))
    _assert_test_database(url)

    with engine.connect() as connection:
        tables = inspect(connection).get_table_names()
        connection.execute(text("SET FOREIGN_KEY_CHECKS=0"))
        try:
            for table_name in tables:
                if table_name == "alembic_version":
                    continue
                connection.execute(text(f"TRUNCATE TABLE {_quote_identifier(table_name)}"))
        finally:
            connection.execute(text("SET FOREIGN_KEY_CHECKS=1"))
            connection.commit()


def prepare_test_database() -> None:
    ensure_test_database_exists()
    upgrade_test_database()


def dispose_test_engine() -> None:
    get_test_engine().dispose()
    get_test_engine.cache_clear()
    get_test_sessionmaker.cache_clear()
