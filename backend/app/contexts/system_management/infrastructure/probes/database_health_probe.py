"""SQLAlchemy database health adapter."""

import time
from datetime import datetime

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.contexts.system_management.application.dto import (
    ComponentHealth,
    ComponentTestResult,
)
from app.contexts.system_management.domain import HealthStatus


class SqlAlchemyDatabaseHealthProbe:
    name = "database"

    def __init__(self, session: Session) -> None:
        self._session = session

    async def check(self) -> ComponentHealth:
        started = time.perf_counter()
        try:
            row = self._session.execute(text("SELECT 1")).fetchone()
            status: HealthStatus = "healthy" if row else "unhealthy"
            details: dict[str, object] = {
                "connection_pool": "active",
                "query_test": "passed" if row else "empty",
            }
        except Exception as exc:
            status = "unhealthy"
            details = {"error": str(exc), "connection_pool": "failed"}
        return ComponentHealth(
            name=self.name,
            status=status,
            response_time=(time.perf_counter() - started) * 1000,
            details=details,
            last_check=datetime.now(),
        )

    async def test(self) -> ComponentTestResult:
        try:
            row = self._session.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            return ComponentTestResult(
                component=self.name,
                passed=True,
                details={"user_count": int(row[0]) if row else 0},
            )
        except Exception as exc:
            return ComponentTestResult(
                component=self.name,
                passed=False,
                error=str(exc),
            )
