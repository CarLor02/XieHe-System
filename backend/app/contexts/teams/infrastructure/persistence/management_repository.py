"""SQLAlchemy team lifecycle commands."""

from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.teams.domain import (
    TeamConflict,
    TeamPermissionDenied,
    TeamSummarySnapshot,
    TeamValidationError,
    normalize_team_name,
    require_user_id,
)

from .base import AsyncTeamRepositoryBase
from .mappers import team_summary
from .models import (
    Team,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)


class SqlAlchemyTeamManagementRepository(AsyncTeamRepositoryBase):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def create(
        self, creator_id: int, data: dict[str, Any]
    ) -> TeamSummarySnapshot:
        creator_id = require_user_id(creator_id)
        creator = await self._get_user(creator_id)
        if not creator.is_system_admin:
            raise TeamPermissionDenied("只有系统管理员可以创建团队")
        name = normalize_team_name(str(data["name"]))
        duplicate = await self._session.scalar(
            select(Team.id).where(func.lower(Team.name) == name.lower())
        )
        if duplicate is not None:
            raise TeamConflict("团队名称已存在")
        team = Team(
            name=name,
            description=data.get("description"),
            hospital=data.get("hospital"),
            department=data.get("department"),
            creator_id=creator_id,
            max_members=data.get("max_members") or 50,
            is_active=True,
        )
        self._session.add(team)
        await self._session.flush()
        self._session.add(
            TeamMembership(
                team_id=team.id,
                user_id=creator_id,
                role=TeamMembershipRole.ADMIN,
                status=TeamMembershipStatus.ACTIVE,
            )
        )
        await self._session.commit()
        return team_summary(await self._reload_team(team.id), creator_id)

    async def update(
        self, team_id: int, operator_id: int, data: dict[str, Any]
    ) -> TeamSummarySnapshot:
        operator_id = require_user_id(operator_id)
        operator = await self._get_user(operator_id)
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
        if not operator.is_system_admin and not (
            membership and membership.role == TeamMembershipRole.ADMIN
        ):
            raise TeamPermissionDenied("只有系统管理员或团队管理员可以修改团队信息")

        if data.get("name") is not None:
            name = normalize_team_name(str(data["name"]))
            duplicate = await self._session.scalar(
                select(Team.id).where(
                    func.lower(Team.name) == name.lower(),
                    Team.id != team_id,
                    Team.is_active.is_(True),
                )
            )
            if duplicate is not None:
                raise TeamConflict("团队名称已存在")
            team.name = name
        for field in ("description", "hospital", "department"):
            value = data.get(field)
            if value is not None:
                setattr(team, field, str(value).strip() or None)
        if data.get("max_members") is not None:
            max_members = int(data["max_members"])
            active_count = sum(
                item.status == TeamMembershipStatus.ACTIVE for item in team.memberships
            )
            if max_members < active_count:
                raise TeamValidationError("最大成员数不能小于当前成员数")
            team.max_members = max_members
        await self._session.commit()
        return team_summary(await self._reload_team(team_id), operator_id)
