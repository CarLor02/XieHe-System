"""团队管理业务逻辑"""

from __future__ import annotations

import secrets
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

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


def _normalize_user_id(user_id: Optional[int | str]) -> Optional[int]:
    """将用户ID转换为整数"""

    if user_id is None:
        return None
    if isinstance(user_id, int):
        return user_id
    try:
        return int(user_id)
    except (TypeError, ValueError):
        return None


class TeamService:
    """团队管理服务"""

    def _build_team_summary(self, team: Team, current_user_id: Optional[int]) -> Dict:
        member_count = sum(
            1 for m in team.memberships if m.status == TeamMembershipStatus.ACTIVE
        )
        membership = None
        if current_user_id is not None:
            membership = next(
                (m for m in team.memberships if m.user_id == current_user_id),
                None,
            )
        join_request = None
        if current_user_id is not None:
            join_request = next(
                (
                    req
                    for req in team.join_requests
                    if req.user_id == current_user_id
                ),
                None,
            )
        leader_name = None
        if team.leader:
            leader_name = team.leader.real_name or team.leader.username

        return {
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "hospital": team.hospital,
            "department": team.department,
            "leader_name": leader_name,
            "member_count": member_count,
            "max_members": team.max_members,
            "is_member": bool(
                membership and membership.status == TeamMembershipStatus.ACTIVE
            ),
            "join_status": join_request.status.value if join_request else None,
            "created_at": team.created_at,
        }

    def search_teams(
        self, db: Session, keyword: Optional[str], current_user_id: Optional[int], limit: int
    ) -> List[Dict]:
        query = (
            db.query(Team)
            .options(
                joinedload(Team.memberships),
                joinedload(Team.join_requests),
                joinedload(Team.leader),
            )
            .filter(Team.is_active.is_(True))
        )

        if keyword:
            like = f"%{keyword.strip()}%"
            query = query.filter(
                or_(
                    Team.name.ilike(like),
                    Team.description.ilike(like),
                    Team.hospital.ilike(like),
                    Team.department.ilike(like),
                )
            )

        teams = query.order_by(Team.created_at.desc()).limit(limit).all()
        current_user_id = _normalize_user_id(current_user_id)
        return [self._build_team_summary(team, current_user_id) for team in teams]

    def list_user_teams(self, db: Session, user_id: int) -> List[Dict]:
        user_id = _normalize_user_id(user_id)
        if user_id is None:
            return []

        memberships = (
            db.query(TeamMembership)
            .options(
                joinedload(TeamMembership.team)
                .joinedload(Team.memberships),
                joinedload(TeamMembership.team).joinedload(Team.leader),
            )
            .filter(
                TeamMembership.user_id == user_id,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
            )
            .all()
        )
        return [
            self._build_team_summary(membership.team, user_id)
            for membership in memberships
            if membership.team
        ]

    def apply_to_join(
        self, db: Session, user_id: int, team_id: int, message: Optional[str]
    ) -> TeamJoinRequest:
        user_id = _normalize_user_id(user_id)
        if user_id is None:
            raise ValueError("无效的用户ID")

        team = (
            db.query(Team)
            .options(joinedload(Team.memberships), joinedload(Team.join_requests))
            .filter(Team.id == team_id, Team.is_active.is_(True))
            .first()
        )
        if not team:
            raise ValueError("团队不存在或已停用")

        existing_membership = (
            db.query(TeamMembership)
            .filter(TeamMembership.team_id == team_id, TeamMembership.user_id == user_id)
            .first()
        )
        if existing_membership and existing_membership.status == TeamMembershipStatus.ACTIVE:
            raise ValueError("您已是该团队成员")

        join_request = (
            db.query(TeamJoinRequest)
            .filter(TeamJoinRequest.team_id == team_id, TeamJoinRequest.user_id == user_id)
            .first()
        )

        if join_request:
            if join_request.status == TeamJoinRequestStatus.PENDING:
                return join_request
            join_request.status = TeamJoinRequestStatus.PENDING
            join_request.message = message
            join_request.created_at = datetime.utcnow()
        else:
            join_request = TeamJoinRequest(
                team_id=team_id,
                user_id=user_id,
                message=message,
                status=TeamJoinRequestStatus.PENDING,
            )
            db.add(join_request)

        db.commit()
        db.refresh(join_request)
        return join_request

    def get_team_members(
        self, db: Session, team_id: int, current_user_id: int
    ) -> Dict[str, object]:
        current_user_id = _normalize_user_id(current_user_id)
        if current_user_id is None:
            raise ValueError("无效的用户ID")

        team = (
            db.query(Team)
            .options(
                joinedload(Team.memberships)
                .joinedload(TeamMembership.user)
                .joinedload(User.department),
                joinedload(Team.leader),
            )
            .filter(Team.id == team_id, Team.is_active.is_(True))
            .first()
        )
        if not team:
            raise ValueError("团队不存在或已停用")

        membership = next(
            (m for m in team.memberships if m.user_id == current_user_id), None
        )
        if not membership or membership.status != TeamMembershipStatus.ACTIVE:
            raise PermissionError("您不是该团队成员，无法查看成员列表")

        members: List[Dict[str, object]] = []
        for member in team.memberships:
            user = member.user
            department_name = None
            if user and user.department:
                department_name = user.department.name
            members.append(
                {
                    "user_id": member.user_id,
                    "username": user.username if user else "",
                    "real_name": user.real_name if user else None,
                    "email": user.email if user else None,
                    "role": member.role.value,
                    "status": member.status.value,
                    "department": department_name,
                    "is_leader": team.leader_id == member.user_id,
                    "joined_at": member.joined_at,
                }
            )

        return {
            "team": self._build_team_summary(team, current_user_id),
            "members": members,
        }

    def invite_member(
        self,
        db: Session,
        inviter_id: int,
        team_id: int,
        email: str,
        role: str,
        message: Optional[str] = None,
    ) -> TeamInvitation:
        inviter_id = _normalize_user_id(inviter_id)
        if inviter_id is None:
            raise ValueError("无效的邀请人ID")

        membership = (
            db.query(TeamMembership)
            .filter(TeamMembership.team_id == team_id, TeamMembership.user_id == inviter_id)
            .first()
        )
        if not membership or membership.status != TeamMembershipStatus.ACTIVE:
            raise PermissionError("您不是该团队成员，无法发送邀请")

        if membership.role not in {TeamMembershipRole.LEADER, TeamMembershipRole.ADMIN}:
            raise PermissionError("只有团队负责人或管理员可以邀请成员")

        team = (
            db.query(Team)
            .options(joinedload(Team.memberships))
            .filter(Team.id == team_id, Team.is_active.is_(True))
            .first()
        )
        if not team:
            raise ValueError("团队不存在或已停用")

        try:
            target_role = TeamMembershipRole(role) if role else TeamMembershipRole.MEMBER
        except ValueError:
            target_role = TeamMembershipRole.MEMBER

        invitee_user = db.query(User).filter(func.lower(User.email) == email.lower()).first()
        if invitee_user:
            existing_membership = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == team_id,
                    TeamMembership.user_id == invitee_user.id,
                )
                .first()
            )
            if existing_membership and existing_membership.status == TeamMembershipStatus.ACTIVE:
                raise ValueError("该用户已经是团队成员")

        token = secrets.token_urlsafe(24)
        invitation = TeamInvitation(
            team_id=team_id,
            inviter_id=inviter_id,
            invitee_email=email,
            invitee_user_id=invitee_user.id if invitee_user else None,
            role=target_role,
            status=TeamInvitationStatus.PENDING,
            token=token,
            message=message,
        )
        db.add(invitation)

        if invitee_user:
            membership_record = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == team_id,
                    TeamMembership.user_id == invitee_user.id,
                )
                .first()
            )
            if membership_record:
                membership_record.status = TeamMembershipStatus.INVITED
                membership_record.role = target_role
                membership_record.updated_at = datetime.utcnow()
            else:
                membership_record = TeamMembership(
                    team_id=team_id,
                    user_id=invitee_user.id,
                    role=target_role,
                    status=TeamMembershipStatus.INVITED,
                )
                db.add(membership_record)

        db.commit()
        db.refresh(invitation)
        return invitation


team_service = TeamService()
