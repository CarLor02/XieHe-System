"""SQLAlchemy join-request workflows."""

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.contexts.teams.domain import (
    JoinRequestNotFound,
    JoinRequestSnapshot,
    JoinRequestStatus,
    TeamPermissionDenied,
    TeamValidationError,
    require_user_id,
)

from .base import AsyncTeamRepositoryBase
from .mappers import join_request_snapshot
from .models import (
    TeamJoinRequest,
    TeamJoinRequestStatus,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)


class SqlAlchemyTeamJoinRequestRepository(AsyncTeamRepositoryBase):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

    async def apply_to_join(
        self, team_id: int, user_id: int, message: str | None
    ) -> JoinRequestSnapshot:
        user_id = require_user_id(user_id)
        await self._get_team(team_id)
        active_membership = await self._session.scalar(
            select(TeamMembership).where(
                TeamMembership.team_id == team_id,
                TeamMembership.user_id == user_id,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
            )
        )
        if active_membership:
            raise TeamValidationError("您已是该团队成员")
        request = await self._session.scalar(
            select(TeamJoinRequest)
            .options(joinedload(TeamJoinRequest.applicant))
            .where(
                TeamJoinRequest.team_id == team_id,
                TeamJoinRequest.user_id == user_id,
            )
        )
        if request and request.status == TeamJoinRequestStatus.PENDING:
            return join_request_snapshot(request)
        final_message = message.strip() if message else ""
        if request:
            request.status = TeamJoinRequestStatus.PENDING
            request.message = final_message
            request.created_at = datetime.utcnow()
        else:
            request = TeamJoinRequest(
                team_id=team_id,
                user_id=user_id,
                message=final_message,
                status=TeamJoinRequestStatus.PENDING,
            )
            self._session.add(request)
        await self._session.commit()
        return join_request_snapshot(await self._reload_join_request(request.id))

    async def list_join_requests(
        self,
        team_id: int,
        reviewer_id: int,
        status: JoinRequestStatus | None,
    ) -> list[JoinRequestSnapshot]:
        reviewer_id = require_user_id(reviewer_id)
        team = await self._get_team(team_id)
        membership = next(
            (item for item in team.memberships if item.user_id == reviewer_id), None
        )
        if not membership or membership.status != TeamMembershipStatus.ACTIVE:
            raise TeamPermissionDenied("您不是该团队成员，无法查看加入申请")
        if membership.role != TeamMembershipRole.ADMIN:
            raise TeamPermissionDenied("只有团队管理员可以查看加入申请")
        statement = (
            select(TeamJoinRequest)
            .options(joinedload(TeamJoinRequest.applicant))
            .where(TeamJoinRequest.team_id == team_id)
            .order_by(TeamJoinRequest.created_at.desc())
        )
        if status:
            statement = statement.where(TeamJoinRequest.status == status.value)
        requests = (await self._session.scalars(statement)).all()
        return [join_request_snapshot(request) for request in requests]

    async def review_join_request(
        self,
        team_id: int,
        request_id: int,
        reviewer_id: int,
        decision: str,
    ) -> JoinRequestSnapshot:
        reviewer_id = require_user_id(reviewer_id)
        team = await self._get_team(team_id)
        membership = next(
            (item for item in team.memberships if item.user_id == reviewer_id), None
        )
        if not membership or membership.status != TeamMembershipStatus.ACTIVE:
            raise TeamPermissionDenied("您不是该团队成员，无法审核加入申请")
        if membership.role != TeamMembershipRole.ADMIN:
            raise TeamPermissionDenied("只有团队管理员可以审核加入申请")
        request = await self._reload_join_request(request_id)
        if request.team_id != team_id:
            raise JoinRequestNotFound()
        if request.status != TeamJoinRequestStatus.PENDING:
            raise TeamValidationError("该申请已处理")
        normalized_decision = (decision or "").strip().lower()
        if normalized_decision not in {"approve", "reject"}:
            raise TeamValidationError("不支持的审核决策")
        now = datetime.utcnow()
        request.reviewed_at = now
        request.reviewer_id = reviewer_id
        if normalized_decision == "approve":
            request.status = TeamJoinRequestStatus.APPROVED
            target_membership = await self._session.scalar(
                select(TeamMembership).where(
                    TeamMembership.team_id == team_id,
                    TeamMembership.user_id == request.user_id,
                )
            )
            if target_membership:
                target_membership.status = TeamMembershipStatus.ACTIVE
                if target_membership.role != TeamMembershipRole.ADMIN:
                    target_membership.role = TeamMembershipRole.MEMBER
                target_membership.updated_at = now
            else:
                self._session.add(
                    TeamMembership(
                        team_id=team_id,
                        user_id=request.user_id,
                        role=TeamMembershipRole.MEMBER,
                        status=TeamMembershipStatus.ACTIVE,
                        joined_at=now,
                    )
                )
        else:
            request.status = TeamJoinRequestStatus.REJECTED
        await self._session.commit()
        return join_request_snapshot(await self._reload_join_request(request_id))

    async def cancel_join_request(
        self, team_id: int, request_id: int, user_id: int
    ) -> JoinRequestSnapshot:
        user_id = require_user_id(user_id)
        request = await self._reload_join_request(request_id)
        if request.team_id != team_id or request.user_id != user_id:
            raise JoinRequestNotFound("加入申请不存在或无权限操作")
        if request.status != TeamJoinRequestStatus.PENDING:
            raise TeamValidationError("只能撤销待审核的申请")
        request.status = TeamJoinRequestStatus.CANCELLED
        request.reviewed_at = datetime.utcnow()
        request.reviewer_id = user_id
        await self._session.commit()
        return join_request_snapshot(await self._reload_join_request(request_id))
