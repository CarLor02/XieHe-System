"""FastAPI dependency composition for team use cases."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.teams.application import (
    TeamInvitationService,
    TeamJoinRequestService,
    TeamManagementService,
    TeamMembershipService,
    TeamQueryService,
)
from app.contexts.teams.infrastructure import (
    SqlAlchemyTeamInvitationRepository,
    SqlAlchemyTeamJoinRequestRepository,
    SqlAlchemyTeamManagementRepository,
    SqlAlchemyTeamMembershipRepository,
    SqlAlchemyTeamQueryRepository,
)
from app.shared.database import get_async_db


def get_team_query_service(
    session: AsyncSession = Depends(get_async_db),
) -> TeamQueryService:
    return TeamQueryService(SqlAlchemyTeamQueryRepository(session))


def get_team_management_service(
    session: AsyncSession = Depends(get_async_db),
) -> TeamManagementService:
    return TeamManagementService(SqlAlchemyTeamManagementRepository(session))


def get_team_join_request_service(
    session: AsyncSession = Depends(get_async_db),
) -> TeamJoinRequestService:
    return TeamJoinRequestService(SqlAlchemyTeamJoinRequestRepository(session))


def get_team_membership_service(
    session: AsyncSession = Depends(get_async_db),
) -> TeamMembershipService:
    return TeamMembershipService(SqlAlchemyTeamMembershipRepository(session))


def get_team_invitation_service(
    session: AsyncSession = Depends(get_async_db),
) -> TeamInvitationService:
    return TeamInvitationService(SqlAlchemyTeamInvitationRepository(session))
