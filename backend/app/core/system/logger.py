"""Internal logging-service client and application logger facade."""

from __future__ import annotations

import inspect
import queue
import sys
import threading
import time
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx

from app.contracts.logging_service.v1 import (
    LogEvent,
    LogEventIngestRequest,
    LogLevel,
    model_to_json_dict,
)
from app.core.config import settings
from app.core.system.request_context import get_request_id


SERVICE_NAME_PREFIX = "medical_backend"


class Logger:
    """Logger queues LogEvent objects and sends them to the Go logging service."""

    def __init__(
        self,
        *,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout: Optional[float] = None,
        sync_transport: Optional[httpx.BaseTransport] = None,
        queue_size: int = 4096,
    ) -> None:
        """Configure the logging-service endpoint and local non-blocking queue."""
        self.base_url = (base_url or settings.LOGGING_SERVICE_URL).rstrip("/")
        self.logging_service_token = token if token is not None else settings.LOGGING_SERVICE_TOKEN
        self.timeout = timeout if timeout is not None else settings.LOGGING_SERVICE_TIMEOUT
        self.sync_transport = sync_transport
        self._queue: queue.Queue[LogEvent] = queue.Queue(maxsize=queue_size)
        self._worker_started = False
        self._worker_lock = threading.Lock()
        self._last_fallback_warning = 0.0

    def emit_event(
        self,
        level: LogLevel,
        *,
        message: str,
        service: Optional[str] = None,
        trace_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None,
    ) -> bool:
        """Build a LogEvent, enqueue it locally, and return without waiting for HTTP."""
        if not isinstance(level, LogLevel):
            raise TypeError("level must be a LogLevel")

        event = LogEvent(
            timestamp=timestamp or datetime.now(timezone.utc),
            level=level,
            service=service or self.get_default_service_name(),
            message=message,
            trace_id=trace_id or get_request_id() or "",
            metadata=metadata or {},
        )
        return self._enqueue_event(event)

    def get_default_service_name(self) -> str:
        """Return the default service name as medical_backend plus the caller module."""
        frame = inspect.currentframe()
        try:
            frame = frame.f_back if frame is not None else None
            while frame is not None:
                module_name = frame.f_globals.get("__name__", "")
                if module_name and module_name != __name__:
                    return f"{SERVICE_NAME_PREFIX}:{module_name}"
                frame = frame.f_back
        finally:
            del frame
        return f"{SERVICE_NAME_PREFIX}:unknown"

    def _enqueue_event(self, event: LogEvent) -> bool:
        """Put an event on the worker queue and drop it explicitly if the queue is full."""
        self._ensure_worker()
        try:
            self._queue.put_nowait(event)
            return True
        except queue.Full:
            self._fallback_warning("logging-service queue is full; dropping log event")
            return False

    def _send_event_sync(self, event: LogEvent) -> bool:
        """Send a single queued event to logging-service using the JSON HTTP contract."""
        request = LogEventIngestRequest(event=event)
        headers = {"X-Logging-Service-Token": self.logging_service_token}
        if event.trace_id:
            headers["X-Request-ID"] = event.trace_id

        try:
            with httpx.Client(timeout=self.timeout, transport=self.sync_transport) as client:
                response = client.post(
                    f"{self.base_url}/v1/log-events",
                    json=model_to_json_dict(request),
                    headers=headers,
                )
            response.raise_for_status()
            payload = response.json() if response.content else {}
        except Exception as exc:  # noqa: BLE001 - logging must never block business flow.
            self._fallback_warning(f"logging-service emit failed: {exc}")
            return False

        if isinstance(payload, dict) and payload.get("code", 200) >= 400:
            self._fallback_warning(f"logging-service rejected event: {payload}")
            return False
        return True

    def _ensure_worker(self) -> None:
        """Start the daemon worker that drains queued events."""
        if self._worker_started:
            return
        with self._worker_lock:
            if self._worker_started:
                return
            thread = threading.Thread(target=self._worker_loop, daemon=True)
            thread.start()
            self._worker_started = True

    def _worker_loop(self) -> None:
        """Continuously send queued events while isolating failures from application code."""
        while True:
            event = self._queue.get()
            try:
                self._send_event_sync(event)
            finally:
                self._queue.task_done()

    def _fallback_warning(self, message: str) -> None:
        """Print throttled local fallback warnings when logging-service delivery fails."""
        now = time.monotonic()
        if now - self._last_fallback_warning < 30:
            return
        self._last_fallback_warning = now
        print(f"[logging-service-fallback] {message}", file=sys.stderr)


logger = Logger()
