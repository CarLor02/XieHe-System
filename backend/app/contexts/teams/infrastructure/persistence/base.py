"""Shared async SQLAlchemy loading and authorization helpers."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.contexts.teams.domain import (
    InvitationNotFound,
    JoinRequestNotFound,
    TeamNotFound,
    TeamPermissionDenied,
    TeamUserNotFound,
)
from app.models.user import User

from .mappers import team_options
from .models import (
    Team,
    TeamInvitation,
    TeamJoinRequest,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)


class AsyncTeamRepositoryBase:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def _get_user(self, user_id: int) -> User:
        user = await self._session.get(User, user_id)
        if user is None:
            raise TeamUserNotFound()
        return user

    async def _get_team(
        self, team_id: int, *, members_with_users: bool = False
    ) -> Team:
        options = list(team_options())
        if members_with_users:
            options[0] = (
                selectinload(Team.memberships)
                .joinedload(TeamMembership.user)
                .joinedload(User.department)
            )
        team = await self._session.scalar(
            select(Team)
            .options(*options)
            .where(Team.id == team_id, Team.is_active.is_(True))
        )
        if team is None:
            raise TeamNotFound()
        return team

    async def _reload_team(self, team_id: int) -> Team:
        return await self._get_team(team_id)

    async def _reload_join_request(self, request_id: int) -> TeamJoinRequest:
        request = await self._session.scalar(
            select(TeamJoinRequest)
            .options(joinedload(TeamJoinRequest.applicant))
            .where(TeamJoinRequest.id == request_id)
        )
        if request is None:
            raise JoinRequestNotFound()
        return request

    async def _reload_invitation(self, invitation_id: int) -> TeamInvitation:
        invitation = await self._session.scalar(
            select(TeamInvitation)
            .options(
                joinedload(TeamInvitation.team),
                joinedload(TeamInvitation.inviter),
            )
            .where(TeamInvitation.id == invitation_id)
        )
        if invitation is None:
            raise InvitationNotFound()
        return invitation

    async def _require_admin(self, team_id: int, operator_id: int) -> tuple[Team, User]:
        team = await self._get_team(team_id)
        membership = next(
            (
                item
                for item in team.memberships
                if item.user_id == operator_id
                and item.status == TeamMembershipStatus.ACTIVE
            ),
            None,
        )
        if not membership or membership.role != TeamMembershipRole.ADMIN:
            raise TeamPermissionDenied("只有团队管理员可以执行此操作")
        return team, await self._get_user(operator_id)
