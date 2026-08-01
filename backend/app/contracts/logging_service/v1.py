"""Version 1 JSON contract for the internal logging service."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List

from pydantic import BaseModel, Field


class LogLevel(str, Enum):
    """LogLevel defines the severity values accepted by logging-service."""

    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    AUDIT = "AUDIT"


class LogEvent(BaseModel):
    """LogEvent is the JSON payload shared by backend and logging-service."""

    timestamp: datetime
    level: LogLevel
    service: str
    message: str
    trace_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class LogEventIngestRequest(BaseModel):
    """LogEventIngestRequest wraps one event for the HTTP ingest endpoint."""

    event: LogEvent


class LogEventBatchIngestRequest(BaseModel):
    """LogEventBatchIngestRequest wraps multiple events for batch ingestion."""

    events: List[LogEvent]


class LogEventIngestResult(BaseModel):
    """LogEventIngestResult reports how many events were accepted."""

    accepted: int


def model_to_json_dict(model: BaseModel) -> Dict[str, Any]:
    """Return a JSON-ready dictionary from the pinned Pydantic v2 runtime."""
    return model.model_dump(mode="json")
