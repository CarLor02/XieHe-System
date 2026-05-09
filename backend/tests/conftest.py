"""Pytest fixtures shared by backend tests."""

from __future__ import annotations

import os
from collections.abc import Iterator

import pytest
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from tests.db import (
    dispose_test_engine,
    get_test_database_url,
    get_test_engine,
    get_test_sessionmaker,
    prepare_test_database,
    truncate_test_database,
)


# Keep application imports in tests pointed at the isolated test database.
os.environ["DATABASE_URL"] = get_test_database_url()


@pytest.fixture(scope="session")
def test_database_url() -> str:
    return get_test_database_url()


@pytest.fixture(scope="session")
def test_engine() -> Iterator[Engine]:
    prepare_test_database()
    engine = get_test_engine()
    try:
        yield engine
    finally:
        dispose_test_engine()


@pytest.fixture()
def clean_test_database(test_engine: Engine) -> Iterator[None]:
    truncate_test_database(test_engine)
    try:
        yield
    finally:
        truncate_test_database(test_engine)


@pytest.fixture()
def test_session_factory(clean_test_database: None) -> sessionmaker:
    return get_test_sessionmaker()


@pytest.fixture()
def db_session(test_session_factory: sessionmaker) -> Iterator[Session]:
    session = test_session_factory()
    try:
        yield session
    finally:
        session.rollback()
        session.close()
