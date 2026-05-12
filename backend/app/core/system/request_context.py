"""Request-scoped values shared by internal service clients."""

from __future__ import annotations

from contextvars import ContextVar
from typing import Optional


request_id_var: ContextVar[Optional[str]] = ContextVar("request_id", default=None)


def get_request_id() -> Optional[str]:
    return request_id_var.get()
