"""团队管理业务逻辑"""

from __future__ import annotations

import secrets
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.logging import get_logger
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

logger = get_logger(__name__)


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
        
        # 获取创建者信息
        creator_name = None
        if team.creator:
            creator_name = team.creator.real_name or team.creator.username

        join_request_id = None
        if join_request and join_request.status == TeamJoinRequestStatus.PENDING:
            join_request_id = join_request.id

        return {
            "id": team.id,
            "name": team.name,
            "description": team.description,
            "hospital": team.hospital,
            "department": team.department,
            "creator_name": creator_name,  # 改为创建者信息
            "member_count": member_count,
            "max_members": team.max_members,
            "is_member": bool(
                membership and membership.status == TeamMembershipStatus.ACTIVE
            ),
            "my_role": membership.role.value if membership else None,
            "my_status": membership.status.value if membership else None,
            "is_creator": team.creator_id == current_user_id if current_user_id else False,
            "join_status": join_request.status.value if join_request else None,
            "join_request_id": join_request_id,
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
                joinedload(Team.creator),  # 改为creator
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

        # 获取用户信息，检查是否为系统管理员
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            return []
        
        # 超级系统管理员（级别1）：返回所有活跃团队
        if user.is_system_admin and user.system_admin_level == 1:
            all_teams = (
                db.query(Team)
                .options(
                    joinedload(Team.memberships),
                    joinedload(Team.creator),  # 改为creator
                    joinedload(Team.join_requests),
                )
                .filter(Team.is_active.is_(True))
                .order_by(Team.created_at.desc())
                .all()
            )
            return [self._build_team_summary(team, user_id) for team in all_teams]
        
        # 二级系统管理员（级别2）：返回自己创建的团队
        if user.is_system_admin and user.system_admin_level == 2:
            created_teams = (
                db.query(Team)
                .options(
                    joinedload(Team.memberships),
                    joinedload(Team.creator),  # 改为creator
                    joinedload(Team.join_requests),
                )
                .filter(
                    Team.creator_id == user_id,
                    Team.is_active.is_(True)
                )
                .order_by(Team.created_at.desc())
                .all()
            )
            return [self._build_team_summary(team, user_id) for team in created_teams]

        # 普通用户：获取已加入的团队
        memberships = (
            db.query(TeamMembership)
            .options(
                joinedload(TeamMembership.team)
                .joinedload(Team.memberships),
                joinedload(TeamMembership.team).joinedload(Team.creator),  # 改为creator
                joinedload(TeamMembership.team).joinedload(Team.join_requests),
            )
            .filter(
                TeamMembership.user_id == user_id,
                TeamMembership.status == TeamMembershipStatus.ACTIVE,
            )
            .all()
        )
        
        # 获取申请中的团队（还未成为成员）
        pending_requests = (
            db.query(TeamJoinRequest)
            .options(
                joinedload(TeamJoinRequest.team)
                .joinedload(Team.memberships),
                joinedload(TeamJoinRequest.team).joinedload(Team.creator),  # 改为creator
                joinedload(TeamJoinRequest.team).joinedload(Team.join_requests),
            )
            .filter(
                TeamJoinRequest.user_id == user_id,
                TeamJoinRequest.status == TeamJoinRequestStatus.PENDING,
            )
            .all()
        )
        
        # 合并已加入的团队
        result = [
            self._build_team_summary(membership.team, user_id)
            for membership in memberships
            if membership.team
        ]
        
        # 添加申请中的团队（排除已经是成员的团队）
        existing_team_ids = {item["id"] for item in result}
        for req in pending_requests:
            if req.team and req.team.id not in existing_team_ids:
                result.append(self._build_team_summary(req.team, user_id))
        
        return result

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

        # 处理申请理由（可选，允许为空）
        final_message = message.strip() if message else ""

        if join_request:
            if join_request.status == TeamJoinRequestStatus.PENDING:
                return join_request
            join_request.status = TeamJoinRequestStatus.PENDING
            join_request.message = final_message
            join_request.created_at = datetime.utcnow()
        else:
            join_request = TeamJoinRequest(
                team_id=team_id,
                user_id=user_id,
                message=final_message,
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
                joinedload(Team.creator),  # 改为creator
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
        # 只显示激活状态的成员
        for member in team.memberships:
            if member.status != TeamMembershipStatus.ACTIVE:
                continue
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
                    "is_creator": team.creator_id == member.user_id,  # 改为is_creator
                    "is_system_admin": bool(user.is_system_admin) if user and user.is_system_admin is not None else False,
                    "system_admin_level": user.system_admin_level if user and user.system_admin_level is not None else 0,
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

        if membership.role != TeamMembershipRole.ADMIN:
            raise PermissionError("只有团队管理员可以邀请成员")

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

    def create_team(
        self,
        db: Session,
        creator_id: int,
        *,
        name: str,
        description: Optional[str] = None,
        hospital: Optional[str] = None,
        department: Optional[str] = None,
        max_members: Optional[int] = 50,
    ) -> Dict:
        creator_id = _normalize_user_id(creator_id)
        if creator_id is None:
            raise ValueError("无效的用户ID")

        # 检查创建者是否存在并且是系统管理员
        creator = db.query(User).filter(User.id == creator_id).first()
        if not creator:
            raise ValueError("用户不存在")
        
        if not creator.is_system_admin:
            raise PermissionError("只有系统管理员可以创建团队")

        existing = (
            db.query(Team)
            .filter(func.lower(Team.name) == name.strip().lower())
            .first()
        )
        if existing:
            raise ValueError("团队名称已存在")

        # 创建团队，记录创建者
        team = Team(
            name=name.strip(),
            description=description,
            hospital=hospital,
            department=department,
            creator_id=creator_id,  # 记录创建者
            max_members=max_members or 50,
            is_active=True,
        )
        db.add(team)
        db.flush()

        # 为创建者添加管理员成员记录
        membership = TeamMembership(
            team_id=team.id,
            user_id=creator_id,
            role=TeamMembershipRole.ADMIN,
            status=TeamMembershipStatus.ACTIVE,
        )
        db.add(membership)

        db.commit()
        db.refresh(team)

        # 预加载需要的关系数据以生成概要
        db.refresh(team, attribute_names=["memberships", "join_requests", "creator"])  # 改为creator
        return self._build_team_summary(team, creator_id)

    def list_join_requests(
        self,
        db: Session,
        team_id: int,
        reviewer_id: int,
        status: Optional[TeamJoinRequestStatus] = None,
    ) -> List[Dict[str, object]]:
        reviewer_id = _normalize_user_id(reviewer_id)
        if reviewer_id is None:
            raise ValueError("无效的用户ID")

        team = (
            db.query(Team)
            .options(
                joinedload(Team.join_requests).joinedload(TeamJoinRequest.applicant),
                joinedload(Team.memberships),
            )
            .filter(Team.id == team_id, Team.is_active.is_(True))
            .first()
        )
        if not team:
            raise ValueError("团队不存在或已停用")

        membership = next(
            (m for m in team.memberships if m.user_id == reviewer_id),
            None,
        )
        if not membership or membership.status != TeamMembershipStatus.ACTIVE:
            raise PermissionError("您不是该团队成员，无法查看加入申请")

        if membership.role != TeamMembershipRole.ADMIN:
            raise PermissionError("只有团队管理员可以查看加入申请")

        requests = team.join_requests
        if status:
            requests = [req for req in requests if req.status == status]

        results: List[Dict[str, object]] = []
        for req in sorted(requests, key=lambda item: item.created_at, reverse=True):
            applicant = req.applicant
            results.append(
                {
                    "id": req.id,
                    "team_id": req.team_id,
                    "applicant_id": req.user_id,
                    "applicant_username": applicant.username if applicant else "",
                    "applicant_real_name": applicant.real_name if applicant else None,
                    "applicant_email": applicant.email if applicant else None,
                    "message": req.message or "",
                    "status": req.status.value,
                    "requested_at": req.created_at,
                    "reviewed_at": req.reviewed_at,
                    "reviewer_id": req.reviewer_id,
                }
            )

        return results

    def review_join_request(
        self,
        db: Session,
        reviewer_id: int,
        team_id: int,
        request_id: int,
        decision: str,
    ) -> TeamJoinRequest:
        reviewer_id = _normalize_user_id(reviewer_id)
        if reviewer_id is None:
            raise ValueError("无效的用户ID")

        team = (
            db.query(Team)
            .options(joinedload(Team.memberships))
            .filter(Team.id == team_id, Team.is_active.is_(True))
            .first()
        )
        if not team:
            raise ValueError("团队不存在或已停用")

        membership = next(
            (m for m in team.memberships if m.user_id == reviewer_id),
            None,
        )
        if not membership or membership.status != TeamMembershipStatus.ACTIVE:
            raise PermissionError("您不是该团队成员，无法审核加入申请")

        if membership.role != TeamMembershipRole.ADMIN:
            raise PermissionError("只有团队管理员可以审核加入申请")

        join_request = (
            db.query(TeamJoinRequest)
            .options(joinedload(TeamJoinRequest.applicant))
            .filter(
                TeamJoinRequest.id == request_id,
                TeamJoinRequest.team_id == team_id,
            )
            .first()
        )
        if not join_request:
            raise ValueError("加入申请不存在")

        if join_request.status != TeamJoinRequestStatus.PENDING:
            raise ValueError("该申请已处理")

        decision = (decision or "").strip().lower()
        if decision not in {"approve", "reject"}:
            raise ValueError("不支持的审核决策")

        now = datetime.utcnow()
        join_request.reviewed_at = now
        join_request.reviewer_id = reviewer_id

        if decision == "approve":
            join_request.status = TeamJoinRequestStatus.APPROVED

            membership_record = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == team_id,
                    TeamMembership.user_id == join_request.user_id,
                )
                .first()
            )

            if membership_record:
                membership_record.status = TeamMembershipStatus.ACTIVE
                membership_record.role = (
                    membership_record.role
                    if membership_record.role == TeamMembershipRole.ADMIN
                    else TeamMembershipRole.MEMBER
                )
                membership_record.updated_at = now
            else:
                membership_record = TeamMembership(
                    team_id=team_id,
                    user_id=join_request.user_id,
                    role=TeamMembershipRole.MEMBER,
                    status=TeamMembershipStatus.ACTIVE,
                    joined_at=now,
                )
                db.add(membership_record)
        else:
            join_request.status = TeamJoinRequestStatus.REJECTED

        db.commit()
        db.refresh(join_request)
        return join_request

    def cancel_join_request(
        self,
        db: Session,
        user_id: int,
        team_id: int,
        request_id: int,
    ) -> TeamJoinRequest:
        """取消（撤销）用户自己提交的加入申请"""
        user_id = _normalize_user_id(user_id)
        if user_id is None:
            raise ValueError("无效的用户ID")

        join_request = (
            db.query(TeamJoinRequest)
            .filter(
                TeamJoinRequest.id == request_id,
                TeamJoinRequest.team_id == team_id,
                TeamJoinRequest.user_id == user_id,
            )
            .first()
        )
        if not join_request:
            raise ValueError("加入申请不存在或无权限操作")

        if join_request.status != TeamJoinRequestStatus.PENDING:
            raise ValueError("只能撤销待审核的申请")

        join_request.status = TeamJoinRequestStatus.CANCELLED
        join_request.reviewed_at = datetime.utcnow()
        join_request.reviewer_id = user_id  # 记录是用户自己撤销的

        db.commit()
        db.refresh(join_request)
        return join_request

    def update_member_role(
        self,
        db: Session,
        team_id: int,
        operator_user_id: int,
        target_user_id: int,
        new_role: str,
    ) -> None:
        """
        团队管理员修改成员角色
        
        Args:
            db: 数据库会话
            team_id: 团队ID
            operator_user_id: 操作者用户ID（管理员）
            target_user_id: 目标用户ID（被修改角色的成员）
            new_role: 新角色（ADMIN、MEMBER、GUEST）
            
        Raises:
            ValueError: 参数错误、团队不存在、成员不存在
            PermissionError: 权限不足
        """
        operator_user_id = _normalize_user_id(operator_user_id)
        target_user_id = _normalize_user_id(target_user_id)
        
        if operator_user_id is None or target_user_id is None:
            raise ValueError("无效的用户ID")
        
        # 验证新角色是否合法
        try:
            new_role_enum = TeamMembershipRole(new_role)
        except ValueError:
            raise ValueError(f"不支持的角色类型: {new_role}")
        
        # 查询团队
        team = db.query(Team).filter(
            Team.id == team_id,
            Team.is_active.is_(True)
        ).first()
        if not team:
            raise ValueError("团队不存在或已停用")
        
        # 验证操作者是否是管理员
        operator_membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == operator_user_id,
            TeamMembership.status == TeamMembershipStatus.ACTIVE
        ).first()
        
        if not operator_membership or operator_membership.role != TeamMembershipRole.ADMIN:
            raise PermissionError("只有团队管理员可以修改成员角色")
        
        # 查询目标成员
        target_membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == target_user_id,
            TeamMembership.status == TeamMembershipStatus.ACTIVE
        ).first()

        if not target_membership:
            raise ValueError("目标成员不存在或未激活")

        # 获取目标用户信息，检查是否为系统管理员
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise ValueError("目标用户不存在")

        # 权限检查：超级系统管理员（level 1）不能被任何人修改角色
        if target_user.is_system_admin and target_user.system_admin_level == 1:
            raise PermissionError("无法修改超级系统管理员的角色")

        # 获取操作者信息
        operator_user = db.query(User).filter(User.id == operator_user_id).first()
        if not operator_user:
            raise ValueError("操作者用户不存在")

        # 权限检查：团队管理员不能修改系统管理员的角色（除非操作者本身是超级系统管理员）
        if target_user.is_system_admin:
            if not (operator_user.is_system_admin and operator_user.system_admin_level == 1):
                raise PermissionError("只有超级系统管理员可以修改系统管理员的角色")

        # 更新角色
        target_membership.role = new_role_enum
        target_membership.updated_at = datetime.utcnow()

        db.commit()
        db.refresh(target_membership)

    def remove_member(
        self,
        db: Session,
        team_id: int,
        operator_user_id: int,
        target_user_id: int,
    ) -> None:
        """
        团队管理员删除成员

        Args:
            db: 数据库会话
            team_id: 团队ID
            operator_user_id: 操作者用户ID（管理员）
            target_user_id: 目标用户ID（被删除的成员）

        Raises:
            ValueError: 参数错误、团队不存在、成员不存在
            PermissionError: 权限不足
        """
        operator_user_id = _normalize_user_id(operator_user_id)
        target_user_id = _normalize_user_id(target_user_id)

        if operator_user_id is None or target_user_id is None:
            raise ValueError("无效的用户ID")

        # 查询团队
        team = db.query(Team).filter(
            Team.id == team_id,
            Team.is_active.is_(True)
        ).first()
        if not team:
            raise ValueError("团队不存在或已停用")

        # 验证操作者是否是管理员
        operator_membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == operator_user_id,
            TeamMembership.status == TeamMembershipStatus.ACTIVE
        ).first()

        if not operator_membership or operator_membership.role != TeamMembershipRole.ADMIN:
            raise PermissionError("只有团队管理员可以删除成员")

        # 查询目标成员
        target_membership = db.query(TeamMembership).filter(
            TeamMembership.team_id == team_id,
            TeamMembership.user_id == target_user_id,
            TeamMembership.status == TeamMembershipStatus.ACTIVE
        ).first()

        if not target_membership:
            raise ValueError("目标成员不存在或未激活")

        # 不能删除团队创建者
        if target_user_id == team.creator_id:
            raise PermissionError("不能删除团队创建者")

        # 获取目标用户信息，检查是否为系统管理员
        target_user = db.query(User).filter(User.id == target_user_id).first()
        if not target_user:
            raise ValueError("目标用户不存在")

        # 权限检查：超级系统管理员（level 1）不能被删除
        if target_user.is_system_admin and target_user.system_admin_level == 1:
            raise PermissionError("无法删除超级系统管理员")

        # 获取操作者信息
        operator_user = db.query(User).filter(User.id == operator_user_id).first()
        if not operator_user:
            raise ValueError("操作者用户不存在")

        # 权限检查：团队管理员不能删除系统管理员（除非操作者本身是超级系统管理员）
        if target_user.is_system_admin:
            if not (operator_user.is_system_admin and operator_user.system_admin_level == 1):
                raise PermissionError("只有超级系统管理员可以删除系统管理员")

        # 删除成员（软删除，将状态改为INACTIVE）
        target_membership.status = TeamMembershipStatus.INACTIVE
        target_membership.updated_at = datetime.utcnow()

        db.commit()
        logger.info(
            f"团队 {team_id} 成员 {target_user_id} 已被 {operator_user_id} 删除"
        )

    def get_user_invitations(self, db: Session, user_id: int) -> List[Dict]:
        """
        获取用户收到的团队邀请列表

        Args:
            db: 数据库会话
            user_id: 用户ID

        Returns:
            邀请列表
        """
        user_id = _normalize_user_id(user_id)
        if user_id is None:
            raise ValueError("无效的用户ID")

        # 获取用户信息
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("用户不存在")

        # 查询用户收到的邀请（通过邮箱或用户ID）
        invitations = (
            db.query(TeamInvitation)
            .options(
                joinedload(TeamInvitation.team),
                joinedload(TeamInvitation.inviter)
            )
            .filter(
                or_(
                    TeamInvitation.invitee_user_id == user_id,
                    func.lower(TeamInvitation.invitee_email) == func.lower(user.email)
                ),
                TeamInvitation.status == TeamInvitationStatus.PENDING,
                TeamInvitation.expires_at > datetime.utcnow()
            )
            .order_by(TeamInvitation.created_at.desc())
            .all()
        )

        result = []
        for invitation in invitations:
            team = invitation.team
            inviter = invitation.inviter

            result.append({
                "id": invitation.id,
                "team_id": invitation.team_id,
                "team_name": team.name if team else None,
                "team_description": team.description if team else None,
                "inviter_id": invitation.inviter_id,
                "inviter_name": inviter.real_name or inviter.username if inviter else None,
                "role": invitation.role.value,
                "message": invitation.message,
                "created_at": invitation.created_at,
                "expires_at": invitation.expires_at,
                "status": invitation.status.value,
            })

        return result

    def respond_to_invitation(
        self,
        db: Session,
        user_id: int,
        invitation_id: int,
        accept: bool
    ) -> Dict:
        """
        响应团队邀请（接受或拒绝）

        Args:
            db: 数据库会话
            user_id: 用户ID
            invitation_id: 邀请ID
            accept: True表示接受，False表示拒绝

        Returns:
            处理结果

        Raises:
            ValueError: 参数错误、邀请不存在、邀请已过期等
            PermissionError: 权限不足
        """
        user_id = _normalize_user_id(user_id)
        if user_id is None:
            raise ValueError("无效的用户ID")

        # 获取用户信息
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("用户不存在")

        # 查询邀请
        invitation = (
            db.query(TeamInvitation)
            .options(joinedload(TeamInvitation.team))
            .filter(TeamInvitation.id == invitation_id)
            .first()
        )

        if not invitation:
            raise ValueError("邀请不存在")

        # 验证邀请是否属于当前用户
        if invitation.invitee_user_id != user_id and func.lower(invitation.invitee_email) != func.lower(user.email):
            raise PermissionError("无权处理此邀请")

        # 检查邀请状态
        if invitation.status != TeamInvitationStatus.PENDING:
            raise ValueError("邀请已处理")

        # 检查邀请是否过期
        if invitation.expires_at < datetime.utcnow():
            invitation.status = TeamInvitationStatus.EXPIRED
            db.commit()
            raise ValueError("邀请已过期")

        team = invitation.team
        if not team or not team.is_active:
            raise ValueError("团队不存在或已停用")

        now = datetime.utcnow()
        invitation.responded_at = now

        if accept:
            # 接受邀请
            invitation.status = TeamInvitationStatus.ACCEPTED

            # 更新或创建成员记录
            membership = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == invitation.team_id,
                    TeamMembership.user_id == user_id
                )
                .first()
            )

            if membership:
                membership.status = TeamMembershipStatus.ACTIVE
                membership.role = invitation.role
                membership.updated_at = now
            else:
                membership = TeamMembership(
                    team_id=invitation.team_id,
                    user_id=user_id,
                    role=invitation.role,
                    status=TeamMembershipStatus.ACTIVE,
                    joined_at=now
                )
                db.add(membership)

            message = f"已成功加入团队 {team.name}"
        else:
            # 拒绝邀请
            invitation.status = TeamInvitationStatus.REVOKED

            # 如果有INVITED状态的成员记录，将其设为INACTIVE
            membership = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == invitation.team_id,
                    TeamMembership.user_id == user_id,
                    TeamMembership.status == TeamMembershipStatus.INVITED
                )
                .first()
            )

            if membership:
                membership.status = TeamMembershipStatus.INACTIVE
                membership.updated_at = now

            message = "已拒绝邀请"

        db.commit()
        db.refresh(invitation)

        return {
            "message": message,
            "status": invitation.status.value,
            "team_id": invitation.team_id,
            "team_name": team.name
        }


team_service = TeamService()
