"""Async SQLAlchemy implementation of team persistence ports."""

from __future__ import annotations

import secrets
import typing
from datetime import datetime
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.contexts.teams.domain import (
    InvitationNotFound,
    InvitationResponseSnapshot,
    InvitationSnapshot,
    JoinRequestNotFound,
    JoinRequestSnapshot,
    JoinRequestStatus,
    TeamConflict,
    TeamMemberSnapshot,
    TeamMembersSnapshot,
    TeamNotFound,
    TeamPermissionDenied,
    TeamRole,
    TeamSearchQuery,
    TeamSummarySnapshot,
    TeamUserNotFound,
    TeamValidationError,
    normalize_team_name,
    normalize_team_role,
    require_user_id,
)
from app.models.team import (
    Team,
    TeamInvitation,
    TeamInvitationStatus,
    TeamJoinRequest,
    TeamJoinRequestStatus,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)
from app.models.user import User


def _summary(team: Team, current_user_id: int | None) -> TeamSummarySnapshot:
    active_members = [
        membership
        for membership in team.memberships
        if membership.status == TeamMembershipStatus.ACTIVE
    ]
    membership = next(
        (
            item
            for item in team.memberships
            if current_user_id is not None and item.user_id == current_user_id
        ),
        None,
    )
    join_request = next(
        (
            item
            for item in team.join_requests
            if current_user_id is not None and item.user_id == current_user_id
        ),
        None,
    )
    creator_name = None
    if team.creator:
        creator_name = team.creator.real_name or team.creator.username
    return TeamSummarySnapshot(
        id=team.id,
        name=team.name,
        description=team.description,
        hospital=team.hospital,
        department=team.department,
        creator_name=creator_name,
        member_count=len(active_members),
        max_members=team.max_members,
        is_member=bool(membership and membership.status == TeamMembershipStatus.ACTIVE),
        my_role=membership.role.value if membership else None,
        my_status=membership.status.value if membership else None,
        is_creator=bool(current_user_id and team.creator_id == current_user_id),
        join_status=join_request.status.value if join_request else None,
        join_request_id=(
            join_request.id
            if join_request and join_request.status == TeamJoinRequestStatus.PENDING
            else None
        ),
        created_at=team.created_at,
    )


def _join_request_snapshot(request: TeamJoinRequest) -> JoinRequestSnapshot:
    applicant = request.applicant
    return JoinRequestSnapshot(
        id=request.id,
        team_id=request.team_id,
        applicant_id=request.user_id,
        applicant_username=applicant.username if applicant else "",
        applicant_real_name=applicant.real_name if applicant else None,
        applicant_email=applicant.email if applicant else None,
        message=request.message or "",
        status=request.status.value,
        requested_at=request.created_at,
        reviewed_at=request.reviewed_at,
        reviewer_id=request.reviewer_id,
    )


def _invitation_snapshot(invitation: TeamInvitation) -> InvitationSnapshot:
    team = invitation.team
    inviter = invitation.inviter
    return InvitationSnapshot(
        id=invitation.id,
        team_id=invitation.team_id,
        team_name=team.name if team else None,
        team_description=team.description if team else None,
        inviter_id=invitation.inviter_id,
        inviter_name=(inviter.real_name or inviter.username) if inviter else None,
        invitee_email=invitation.invitee_email,
        role=invitation.role.value,
        message=invitation.message,
        created_at=invitation.created_at,
        expires_at=invitation.expires_at,
        status=invitation.status.value,
    )


def _team_options() -> tuple[typing.Any, ...]:
    return (
        selectinload(Team.memberships),
        selectinload(Team.join_requests),
        joinedload(Team.creator),
    )


class SqlAlchemyTeamRepository:
    """Persist team collaboration workflows using one request-scoped session."""

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
        options = list(_team_options())
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

    async def search(self, query: TeamSearchQuery) -> list[TeamSummarySnapshot]:
        statement = (
            select(Team).options(*_team_options()).where(Team.is_active.is_(True))
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
        return [_summary(team, query.current_user_id) for team in teams]

    async def list_for_user(self, user_id: int) -> list[TeamSummarySnapshot]:
        user_id = require_user_id(user_id)
        user = await self._get_user(user_id)
        base = select(Team).options(*_team_options()).where(Team.is_active.is_(True))
        if user.is_system_admin and user.system_admin_level == 1:
            teams = (
                await self._session.scalars(base.order_by(Team.created_at.desc()))
            ).all()
            return [_summary(team, user_id) for team in teams]
        if user.is_system_admin and user.system_admin_level == 2:
            teams = (
                await self._session.scalars(
                    base.where(Team.creator_id == user_id).order_by(
                        Team.created_at.desc()
                    )
                )
            ).all()
            return [_summary(team, user_id) for team in teams]

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
        result = [_summary(team, user_id) for team in member_teams]
        existing_ids = {team.id for team in member_teams}
        result.extend(
            _summary(team, user_id)
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
        return TeamMembersSnapshot(_summary(team, viewer_id), tuple(members))

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
        return _summary(await self._reload_team(team.id), creator_id)

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
        return _summary(await self._reload_team(team_id), operator_id)

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
            return _join_request_snapshot(request)
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
        return _join_request_snapshot(await self._reload_join_request(request.id))

    async def _reload_join_request(self, request_id: int) -> TeamJoinRequest:
        request = await self._session.scalar(
            select(TeamJoinRequest)
            .options(joinedload(TeamJoinRequest.applicant))
            .where(TeamJoinRequest.id == request_id)
        )
        if request is None:
            raise JoinRequestNotFound()
        return request

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
        return [_join_request_snapshot(request) for request in requests]

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
        return _join_request_snapshot(await self._reload_join_request(request_id))

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
        return _join_request_snapshot(await self._reload_join_request(request_id))

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

    async def invite_member(
        self,
        team_id: int,
        inviter_id: int,
        email: str,
        role: str,
        message: str | None,
    ) -> InvitationSnapshot:
        inviter_id = require_user_id(inviter_id)
        team, _ = await self._require_admin(team_id, inviter_id)
        try:
            target_role = TeamMembershipRole(role or TeamRole.MEMBER.value)
        except ValueError:
            target_role = TeamMembershipRole.MEMBER
        invitee = await self._session.scalar(
            select(User).where(func.lower(User.email) == email.lower())
        )
        membership = None
        if invitee:
            membership = await self._session.scalar(
                select(TeamMembership).where(
                    TeamMembership.team_id == team_id,
                    TeamMembership.user_id == invitee.id,
                )
            )
            if membership and membership.status == TeamMembershipStatus.ACTIVE:
                raise TeamValidationError("该用户已经是团队成员")
        invitation = TeamInvitation(
            team_id=team.id,
            inviter_id=inviter_id,
            invitee_email=email,
            invitee_user_id=invitee.id if invitee else None,
            role=target_role,
            status=TeamInvitationStatus.PENDING,
            token=secrets.token_urlsafe(24),
            message=message,
        )
        self._session.add(invitation)
        if invitee:
            if membership:
                membership.status = TeamMembershipStatus.INVITED
                membership.role = target_role
                membership.updated_at = datetime.utcnow()
            else:
                self._session.add(
                    TeamMembership(
                        team_id=team_id,
                        user_id=invitee.id,
                        role=target_role,
                        status=TeamMembershipStatus.INVITED,
                    )
                )
        await self._session.commit()
        return _invitation_snapshot(await self._reload_invitation(invitation.id))

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

    async def list_invitations(self, user_id: int) -> list[InvitationSnapshot]:
        user_id = require_user_id(user_id)
        user = await self._get_user(user_id)
        invitations = (
            await self._session.scalars(
                select(TeamInvitation)
                .options(
                    joinedload(TeamInvitation.team),
                    joinedload(TeamInvitation.inviter),
                )
                .where(
                    or_(
                        TeamInvitation.invitee_user_id == user_id,
                        func.lower(TeamInvitation.invitee_email) == user.email.lower(),
                    ),
                    TeamInvitation.status == TeamInvitationStatus.PENDING,
                    TeamInvitation.expires_at > datetime.utcnow(),
                )
                .order_by(TeamInvitation.created_at.desc())
            )
        ).all()
        return [_invitation_snapshot(invitation) for invitation in invitations]

    async def respond_to_invitation(
        self, invitation_id: int, user_id: int, accept: bool
    ) -> InvitationResponseSnapshot:
        user_id = require_user_id(user_id)
        user = await self._get_user(user_id)
        invitation = await self._reload_invitation(invitation_id)
        if (
            invitation.invitee_user_id != user_id
            and invitation.invitee_email.lower() != user.email.lower()
        ):
            raise TeamPermissionDenied("无权处理此邀请")
        if invitation.status != TeamInvitationStatus.PENDING:
            raise TeamValidationError("邀请已处理")
        if invitation.expires_at < datetime.utcnow():
            invitation.status = TeamInvitationStatus.EXPIRED
            await self._session.commit()
            raise TeamValidationError("邀请已过期")
        team = invitation.team
        if not team or not team.is_active:
            raise TeamNotFound()
        now = datetime.utcnow()
        invitation.responded_at = now
        membership = await self._session.scalar(
            select(TeamMembership).where(
                TeamMembership.team_id == invitation.team_id,
                TeamMembership.user_id == user_id,
            )
        )
        if accept:
            invitation.status = TeamInvitationStatus.ACCEPTED
            if membership:
                membership.status = TeamMembershipStatus.ACTIVE
                membership.role = invitation.role
                membership.updated_at = now
            else:
                self._session.add(
                    TeamMembership(
                        team_id=invitation.team_id,
                        user_id=user_id,
                        role=invitation.role,
                        status=TeamMembershipStatus.ACTIVE,
                        joined_at=now,
                    )
                )
            message = f"已成功加入团队 {team.name}"
        else:
            invitation.status = TeamInvitationStatus.REVOKED
            if membership and membership.status == TeamMembershipStatus.INVITED:
                membership.status = TeamMembershipStatus.INACTIVE
                membership.updated_at = now
            message = "已拒绝邀请"
        await self._session.commit()
        return InvitationResponseSnapshot(
            message=message,
            status=invitation.status.value,
            team_id=invitation.team_id,
            team_name=team.name,
        )
