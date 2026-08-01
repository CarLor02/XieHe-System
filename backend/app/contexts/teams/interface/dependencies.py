"""FastAPI dependency adapters for the team context."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.teams.application import TeamApplicationService
from app.contexts.teams.infrastructure import SqlAlchemyTeamRepository
from app.core.database.session import get_async_db


def get_team_service(
    session: AsyncSession = Depends(get_async_db),
) -> TeamApplicationService:
    return TeamApplicationService(SqlAlchemyTeamRepository(session))
