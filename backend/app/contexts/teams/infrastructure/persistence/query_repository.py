"""SQLAlchemy team discovery and membership queries."""

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.teams.domain import (
    TeamMemberSnapshot,
    TeamMembersSnapshot,
    TeamPermissionDenied,
    TeamSearchQuery,
    TeamSummarySnapshot,
    require_user_id,
)

from .base import AsyncTeamRepositoryBase
from .mappers import team_options, team_summary
from .models import (
    Team,
    TeamJoinRequest,
    TeamJoinRequestStatus,
    TeamMembership,
    TeamMembershipStatus,
)


class SqlAlchemyTeamQueryRepository(AsyncTeamRepositoryBase):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def search(self, query: TeamSearchQuery) -> list[TeamSummarySnapshot]:
        statement = (
            select(Team).options(*team_options()).where(Team.is_active.is_(True))
        )
        if query.keyword:
            pattern = f"%{query.keyword.strip()}%"
            statement = statement.where(
                or_(
                    Team.name.ilike(pattern),
                    Team.description.ilike(pattern),
                    Team.hospital.ilike(pattern),
                    Team.department.ilike(pattern),
                )
            )
        teams = (
            await self._session.scalars(
                statement.order_by(Team.created_at.desc()).limit(query.limit)
            )
        ).all()
        return [team_summary(team, query.current_user_id) for team in teams]

    async def list_for_user(self, user_id: int) -> list[TeamSummarySnapshot]:
        user_id = require_user_id(user_id)
        user = await self._get_user(user_id)
        base = select(Team).options(*team_options()).where(Team.is_active.is_(True))
        if user.is_system_admin and user.system_admin_level == 1:
            teams = (
                await self._session.scalars(base.order_by(Team.created_at.desc()))
            ).all()
            return [team_summary(team, user_id) for team in teams]
        if user.is_system_admin and user.system_admin_level == 2:
            teams = (
                await self._session.scalars(
                    base.where(Team.creator_id == user_id).order_by(
                        Team.created_at.desc()
                    )
                )
            ).all()
            return [team_summary(team, user_id) for team in teams]

        member_teams = (
            (
                await self._session.scalars(
                    base.join(TeamMembership).where(
                        TeamMembership.user_id == user_id,
                        TeamMembership.status == TeamMembershipStatus.ACTIVE,
                    )
                )
            )
            .unique()
            .all()
        )
        pending_teams = (
            (
                await self._session.scalars(
                    base.join(TeamJoinRequest).where(
                        TeamJoinRequest.user_id == user_id,
                        TeamJoinRequest.status == TeamJoinRequestStatus.PENDING,
                    )
                )
            )
            .unique()
            .all()
        )
        result = [team_summary(team, user_id) for team in member_teams]
        existing_ids = {team.id for team in member_teams}
        result.extend(
            team_summary(team, user_id)
            for team in pending_teams
            if team.id not in existing_ids
        )
        return result

    async def get_members(self, team_id: int, viewer_id: int) -> TeamMembersSnapshot:
        viewer_id = require_user_id(viewer_id)
        team = await self._get_team(team_id, members_with_users=True)
        viewer_membership = next(
            (item for item in team.memberships if item.user_id == viewer_id), None
        )
        if (
            not viewer_membership
            or viewer_membership.status != TeamMembershipStatus.ACTIVE
        ):
            raise TeamPermissionDenied("您不是该团队成员，无法查看成员列表")

        members = []
        for membership in team.memberships:
            if membership.status != TeamMembershipStatus.ACTIVE:
                continue
            user = membership.user
            members.append(
                TeamMemberSnapshot(
                    user_id=membership.user_id,
                    username=user.username if user else "",
                    real_name=user.real_name if user else None,
                    email=user.email if user else None,
                    role=membership.role.value,
                    status=membership.status.value,
                    department=(
                        user.department.name if user and user.department else None
                    ),
                    is_creator=team.creator_id == membership.user_id,
                    is_system_admin=bool(user and user.is_system_admin),
                    system_admin_level=(user.system_admin_level or 0) if user else 0,
                    joined_at=membership.joined_at,
                )
            )
        return TeamMembersSnapshot(team_summary(team, viewer_id), tuple(members))
