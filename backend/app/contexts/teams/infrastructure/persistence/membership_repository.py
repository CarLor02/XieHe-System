"""SQLAlchemy team membership mutations."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.contexts.teams.domain import (
    TeamPermissionDenied,
    TeamValidationError,
    normalize_team_role,
    require_user_id,
)

from .base import AsyncTeamRepositoryBase
from .models import TeamMembership, TeamMembershipRole, TeamMembershipStatus


class SqlAlchemyTeamMembershipRepository(AsyncTeamRepositoryBase):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def update_member_role(
        self,
        team_id: int,
        operator_id: int,
        target_user_id: int,
        role: str,
    ) -> None:
        operator_id = require_user_id(operator_id)
        target_user_id = require_user_id(target_user_id)
        target_role = normalize_team_role(role)
        _, operator = await self._require_admin(team_id, operator_id)
        membership = await self._session.scalar(
            select(TeamMembership).where(
                TeamMembership.team_id == team_id,
                TeamMembership.user_id == target_user_id,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
            )
        )
        if membership is None:
            raise TeamValidationError("目标成员不存在或未激活")
        target = await self._get_user(target_user_id)
        if target.is_system_admin and target.system_admin_level == 1:
            raise TeamPermissionDenied("无法修改超级系统管理员的角色")
        if target.is_system_admin and not (
            operator.is_system_admin and operator.system_admin_level == 1
        ):
            raise TeamPermissionDenied("只有超级系统管理员可以修改系统管理员的角色")
        membership.role = TeamMembershipRole(target_role.value)
        membership.updated_at = datetime.utcnow()
        await self._session.commit()

    async def remove_member(
        self, team_id: int, operator_id: int, target_user_id: int
    ) -> None:
        operator_id = require_user_id(operator_id)
        target_user_id = require_user_id(target_user_id)
        team, operator = await self._require_admin(team_id, operator_id)
        membership = await self._session.scalar(
            select(TeamMembership).where(
                TeamMembership.team_id == team_id,
                TeamMembership.user_id == target_user_id,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
            )
        )
        if membership is None:
            raise TeamValidationError("目标成员不存在或未激活")
        if target_user_id == team.creator_id:
            raise TeamPermissionDenied("不能删除团队创建者")
        target = await self._get_user(target_user_id)
        if target.is_system_admin and target.system_admin_level == 1:
            raise TeamPermissionDenied("无法删除超级系统管理员")
        if target.is_system_admin and not (
            operator.is_system_admin and operator.system_admin_level == 1
        ):
            raise TeamPermissionDenied("只有超级系统管理员可以删除系统管理员")
        membership.status = TeamMembershipStatus.INACTIVE
        membership.updated_at = datetime.utcnow()
        await self._session.commit()
