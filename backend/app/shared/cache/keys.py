"""Stable cache-key construction without exposing sensitive query values."""

from __future__ import annotations

import hashlib
import json
from collections.abc import Mapping, Sequence
from datetime import date, datetime
from enum import Enum
from typing import Any


def _json_default(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, set):
        return sorted(value)
    raise TypeError(f"Unsupported cache-key value: {type(value).__name__}")


def hash_cache_parameters(parameters: Mapping[str, Any] | Sequence[Any]) -> str:
    """Hash normalized parameters so keys never contain patient PII."""

    payload = json.dumps(
        parameters,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
        default=_json_default,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def build_cache_key(
    *parts: str | int, parameters: Mapping[str, Any] | None = None
) -> str:
    """Build a namespaced logical key; the adapter adds the global namespace."""

    key = ":".join(str(part) for part in parts)
    if parameters is not None:
        key = f"{key}:{hash_cache_parameters(parameters)}"
    return key
