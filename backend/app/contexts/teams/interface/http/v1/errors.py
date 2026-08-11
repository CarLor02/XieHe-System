"""HTTP translation for expected team-domain failures."""

from typing import Any

from fastapi import HTTPException

from app.contexts.teams.domain import (
    InvitationNotFound,
    JoinRequestNotFound,
    TeamConflict,
    TeamDomainError,
    TeamNotFound,
    TeamPermissionDenied,
    TeamUserNotFound,
    TeamValidationError,
)
from app.core.system.logger import LogLevel, logger


def actor_id(current_user: dict[str, Any]) -> int:
    value = current_user.get("id") or current_user.get("user_id")
    if value is None:
        raise HTTPException(status_code=400, detail="无效的用户ID")
    return int(value)


def domain_http_error(exc: TeamDomainError) -> HTTPException:
    if isinstance(exc, TeamPermissionDenied):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(
        exc, (TeamNotFound, TeamUserNotFound, JoinRequestNotFound, InvitationNotFound)
    ):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, (TeamConflict, TeamValidationError)):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=400, detail=str(exc))


def log_failure(operation: str, exc: Exception) -> None:
    logger.emit_event(LogLevel.ERROR, message=f"{operation}失败: {exc}")
