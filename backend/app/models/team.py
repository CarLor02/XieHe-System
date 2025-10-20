"""
团队与团队成员相关模型

定义团队、团队成员、加入申请与邀请等数据库模型。
"""

from __future__ import annotations

import enum
from datetime import datetime, timedelta
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from .base import Base


class TeamMembershipRole(str, enum.Enum):
    """团队成员角色枚举"""

    ADMIN = "ADMIN"
    MEMBER = "MEMBER"
    GUEST = "GUEST"


class TeamMembershipStatus(str, enum.Enum):
    """团队成员状态枚举"""

    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    PENDING = "PENDING"
    INACTIVE = "INACTIVE"


class TeamJoinRequestStatus(str, enum.Enum):
    """团队加入申请状态"""

    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class TeamInvitationStatus(str, enum.Enum):
    """团队邀请状态"""

    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class Team(Base):
    """团队表"""

    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="团队ID")
    name = Column(String(120), unique=True, nullable=False, comment="团队名称")
    description = Column(Text, nullable=True, comment="团队描述")
    hospital = Column(String(120), nullable=True, comment="所属医院")
    department = Column(String(120), nullable=True, comment="所属科室")
    leader_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="负责人ID")
    max_members = Column(Integer, default=50, nullable=False, comment="最大成员数")
    is_active = Column(Boolean, default=True, nullable=False, comment="是否激活")
    created_at = Column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at = Column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间",
    )

    # 关系
    leader = relationship("User", backref="led_teams", foreign_keys=[leader_id])
    memberships = relationship(
        "TeamMembership",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    join_requests = relationship(
        "TeamJoinRequest",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    invitations = relationship(
        "TeamInvitation",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class TeamMembership(Base):
    """团队成员关联表"""

    __tablename__ = "team_memberships"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_team_user"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, comment="团队ID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="用户ID")
    role = Column(
        Enum(TeamMembershipRole),
        default=TeamMembershipRole.MEMBER,
        nullable=False,
        comment="团队角色",
    )
    status = Column(
        Enum(TeamMembershipStatus),
        default=TeamMembershipStatus.ACTIVE,
        nullable=False,
        comment="成员状态",
    )
    joined_at = Column(DateTime, default=func.now(), nullable=False, comment="加入时间")
    updated_at = Column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间",
    )

    # 关系
    team = relationship("Team", back_populates="memberships")
    user = relationship("User", back_populates="team_memberships")


class TeamJoinRequest(Base):
    """团队加入申请"""

    __tablename__ = "team_join_requests"
    __table_args__ = (
        UniqueConstraint("team_id", "user_id", name="uq_join_request"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, comment="团队ID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="申请用户ID")
    message = Column(Text, nullable=True, comment="申请说明")
    status = Column(
        Enum(TeamJoinRequestStatus),
        default=TeamJoinRequestStatus.PENDING,
        nullable=False,
        comment="申请状态",
    )
    created_at = Column(DateTime, default=func.now(), nullable=False, comment="申请时间")
    reviewed_at = Column(DateTime, nullable=True, comment="处理时间")
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="审核人ID")

    # 关系
    team = relationship("Team", back_populates="join_requests")
    applicant = relationship("User", foreign_keys=[user_id])
    reviewer = relationship("User", foreign_keys=[reviewer_id])


class TeamInvitation(Base):
    """团队邀请记录"""

    __tablename__ = "team_invitations"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="记录ID")
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False, comment="团队ID")
    inviter_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="邀请人ID")
    invitee_email = Column(String(160), nullable=False, comment="受邀人邮箱")
    invitee_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, comment="受邀用户ID")
    role = Column(
        Enum(TeamMembershipRole),
        default=TeamMembershipRole.MEMBER,
        nullable=False,
        comment="邀请角色",
    )
    status = Column(
        Enum(TeamInvitationStatus),
        default=TeamInvitationStatus.PENDING,
        nullable=False,
        comment="邀请状态",
    )
    token = Column(String(120), unique=True, nullable=False, comment="邀请令牌")
    message = Column(Text, nullable=True, comment="邀请信息")
    created_at = Column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    expires_at = Column(
        DateTime,
        default=lambda: datetime.utcnow() + timedelta(days=7),
        nullable=False,
        comment="过期时间",
    )
    responded_at = Column(DateTime, nullable=True, comment="回应时间")

    # 关系
    team = relationship("Team", back_populates="invitations")
    inviter = relationship("User", foreign_keys=[inviter_id])
    invitee = relationship("User", foreign_keys=[invitee_user_id])