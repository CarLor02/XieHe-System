"""Map team ORM records to domain read snapshots."""

import typing

from sqlalchemy.orm import joinedload, selectinload

from app.contexts.teams.domain import (
    InvitationSnapshot,
    JoinRequestSnapshot,
    TeamSummarySnapshot,
)

from .models import (
    Team,
    TeamInvitation,
    TeamJoinRequest,
    TeamJoinRequestStatus,
    TeamMembershipStatus,
)


def team_options() -> tuple[typing.Any, ...]:
    return (
        selectinload(Team.memberships),
        selectinload(Team.join_requests),
        joinedload(Team.creator),
    )


def team_summary(team: Team, current_user_id: int | None) -> TeamSummarySnapshot:
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


def join_request_snapshot(request: TeamJoinRequest) -> JoinRequestSnapshot:
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


def invitation_snapshot(invitation: TeamInvitation) -> InvitationSnapshot:
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
