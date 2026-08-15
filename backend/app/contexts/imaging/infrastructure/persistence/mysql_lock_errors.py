"""将 MySQL 瞬时锁错误翻译为应用层可重试语义。"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager

from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.contexts.imaging.application.errors import RetryablePersistenceError

_RETRYABLE_MYSQL_LOCK_ERROR_CODES = frozenset({1205, 1213})


def _mysql_error_code(error: OperationalError) -> int | None:
    arguments = getattr(error.orig, "args", ())
    if not arguments or not isinstance(arguments[0], int):
        return None
    return arguments[0]


@contextmanager
def translate_mysql_lock_errors() -> Iterator[None]:
    try:
        yield
    except OperationalError as exc:
        error_code = _mysql_error_code(exc)
        if error_code in _RETRYABLE_MYSQL_LOCK_ERROR_CODES:
            raise RetryablePersistenceError(
                f"MySQL transient lock error {error_code}"
            ) from exc
        raise


def commit_with_lock_translation(session: Session) -> None:
    with translate_mysql_lock_errors():
        session.commit()
