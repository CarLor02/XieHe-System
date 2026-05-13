import queue
import httpx
import pytest
import time

from app.contracts.logging_service.v1 import LogLevel
from app.core.system.logger import Logger


def test_emit_event_requires_log_level_enum() -> None:
    gateway = Logger(base_url="http://logging-service:8091", token="secret")

    with pytest.raises(TypeError):
        gateway.emit_event(
            level="INFO",  # type: ignore[arg-type]
            service="payment-service",
            message="payment succeeded",
            trace_id="abc",
            metadata={},
        )


def test_emit_event_sends_api_envelope_payload_in_background() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "code": 200,
                "message": "accepted",
                "data": {"accepted": 1},
                "timestamp": "2026-05-12T10:20:31Z",
            },
        )

    gateway = Logger(
        base_url="http://logging-service:8091",
        token="secret",
        timeout=1.0,
        sync_transport=httpx.MockTransport(handler),
    )

    result = gateway.emit_event(
        level=LogLevel.INFO,
        service="payment-service",
        message="payment succeeded",
        trace_id="abc",
        metadata={"order_id": "o_123"},
    )

    assert result is True
    deadline = time.monotonic() + 1.0
    while not requests and time.monotonic() < deadline:
        time.sleep(0.01)

    assert len(requests) == 1
    assert requests[0].url.path == "/v1/log-events"
    assert requests[0].headers["X-Logging-Service-Token"] == "secret"
    assert requests[0].headers["X-Request-ID"] == "abc"
    assert requests[0].read()


def test_emit_event_uses_caller_module_as_default_service(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    captured = []
    gateway = Logger(base_url="http://logging-service:8091", token="secret")

    monkeypatch.setattr(gateway, "_enqueue_event", lambda event: captured.append(event) or True)

    assert gateway.emit_event(LogLevel.INFO, message="payment succeeded")
    assert captured[0].service == f"medical_backend:{__name__}"


def test_emit_event_returns_false_when_queue_is_full(monkeypatch: pytest.MonkeyPatch) -> None:
    gateway = Logger(base_url="http://logging-service:8091", token="secret")
    gateway._queue = queue.Queue(maxsize=1)

    monkeypatch.setattr(gateway, "_ensure_worker", lambda: None)

    assert gateway.emit_event(
        level=LogLevel.INFO,
        service="payment-service",
        message="first",
        trace_id="abc",
        metadata={},
    )
    assert not gateway.emit_event(
        level=LogLevel.INFO,
        service="payment-service",
        message="second",
        trace_id="abc",
        metadata={},
    )
