"""SQLAlchemy team invitation workflows."""

import secrets
from datetime import datetime

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.contexts.access_control.infrastructure.persistence.models import User
from app.contexts.teams.domain import (
    InvitationResponseSnapshot,
    InvitationSnapshot,
    TeamNotFound,
    TeamPermissionDenied,
    TeamRole,
    TeamValidationError,
    require_user_id,
)

from .base import AsyncTeamRepositoryBase
from .mappers import invitation_snapshot
from .models import (
    TeamInvitation,
    TeamInvitationStatus,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)


class SqlAlchemyTeamInvitationRepository(AsyncTeamRepositoryBase):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session)

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
        return invitation_snapshot(await self._reload_invitation(invitation.id))

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
        return [invitation_snapshot(invitation) for invitation in invitations]

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
