from datetime import datetime, timezone

import pytest
from pydantic import ValidationError

from app.contracts.logging_service.v1 import (
    LogEvent,
    LogEventBatchIngestRequest,
    LogEventIngestRequest,
    LogEventIngestResult,
    LogLevel,
)


def test_log_event_accepts_expected_json_shape() -> None:
    event = LogEvent(
        timestamp="2026-05-12T10:20:30.123Z",
        level="INFO",
        service="payment-service",
        message="payment succeeded",
        trace_id="abc",
        metadata={"order_id": "o_123", "amount": 100},
    )

    assert event.level is LogLevel.INFO
    assert event.timestamp == datetime(2026, 5, 12, 10, 20, 30, 123000, tzinfo=timezone.utc)
    assert event.metadata["amount"] == 100


def test_log_level_rejects_unknown_values() -> None:
    with pytest.raises(ValidationError):
        LogEvent(
            timestamp="2026-05-12T10:20:30.123Z",
            level="TRACE",
            service="payment-service",
            message="payment succeeded",
            trace_id="abc",
            metadata={},
        )


def test_ingest_request_models_wrap_events_and_result() -> None:
    event = LogEvent(
        timestamp="2026-05-12T10:20:30.123Z",
        level=LogLevel.AUDIT,
        service="access-service",
        message="role changed",
        trace_id="req-1",
        metadata={"role": "admin"},
    )

    single = LogEventIngestRequest(event=event)
    batch = LogEventBatchIngestRequest(events=[event])
    result = LogEventIngestResult(accepted=1)

    assert single.event.level is LogLevel.AUDIT
    assert batch.events == [event]
    assert result.accepted == 1
