"""SQLAlchemy models owned by the teams context."""

from __future__ import annotations

import datetime as datetime_types
import enum
import typing
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
from sqlalchemy.orm import Mapped, relationship

from app.contexts.access_control.infrastructure.persistence.models import User
from app.shared.database.sqlalchemy import Base


class TeamMembershipRole(str, enum.Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class TeamMembershipStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    PENDING = "PENDING"
    INACTIVE = "INACTIVE"


class TeamJoinRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class TeamInvitationStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


class Team(Base):
    __tablename__ = "teams"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="团队ID"
    )
    name: Mapped[typing.Any] = Column(
        String(120), unique=True, nullable=False, comment="团队名称"
    )
    description: Mapped[str | None] = Column(Text, nullable=True, comment="团队描述")
    hospital: Mapped[typing.Any] = Column(
        String(120), nullable=True, comment="所属医院"
    )
    department: Mapped[typing.Any] = Column(
        String(120), nullable=True, comment="所属科室"
    )
    creator_id: Mapped[int | None] = Column(
        Integer, ForeignKey("users.id"), nullable=True, comment="创建者ID"
    )
    max_members: Mapped[int] = Column(
        Integer, default=50, nullable=False, comment="最大成员数"
    )
    is_active: Mapped[bool] = Column(
        Boolean, default=True, nullable=False, comment="是否激活"
    )
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime] = Column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间",
    )

    creator: Mapped[User | None] = relationship(
        "User", backref="created_teams", foreign_keys=[creator_id]
    )
    memberships: Mapped[list[TeamMembership]] = relationship(
        "TeamMembership",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    join_requests: Mapped[list[TeamJoinRequest]] = relationship(
        "TeamJoinRequest",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    invitations: Mapped[list[TeamInvitation]] = relationship(
        "TeamInvitation",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )


class TeamMembership(Base):
    __tablename__ = "team_memberships"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_team_user"),)

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="记录ID"
    )
    team_id: Mapped[int] = Column(
        Integer, ForeignKey("teams.id"), nullable=False, comment="团队ID"
    )
    user_id: Mapped[int] = Column(
        Integer, ForeignKey("users.id"), nullable=False, comment="用户ID"
    )
    role: Mapped[TeamMembershipRole] = Column(
        Enum(TeamMembershipRole),
        default=TeamMembershipRole.MEMBER,
        nullable=False,
        comment="团队角色",
    )
    status: Mapped[TeamMembershipStatus] = Column(
        Enum(TeamMembershipStatus),
        default=TeamMembershipStatus.ACTIVE,
        nullable=False,
        comment="成员状态",
    )
    joined_at: Mapped[datetime_types.datetime] = Column(
        DateTime, default=func.now(), nullable=False, comment="加入时间"
    )
    updated_at: Mapped[datetime_types.datetime] = Column(
        DateTime,
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间",
    )

    team: Mapped[Team] = relationship("Team", back_populates="memberships")
    user: Mapped[User] = relationship("User", back_populates="team_memberships")


class TeamJoinRequest(Base):
    __tablename__ = "team_join_requests"
    __table_args__ = (UniqueConstraint("team_id", "user_id", name="uq_join_request"),)

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="记录ID"
    )
    team_id: Mapped[int] = Column(
        Integer, ForeignKey("teams.id"), nullable=False, comment="团队ID"
    )
    user_id: Mapped[int] = Column(
        Integer, ForeignKey("users.id"), nullable=False, comment="申请用户ID"
    )
    message: Mapped[str | None] = Column(Text, nullable=True, comment="申请说明")
    status: Mapped[TeamJoinRequestStatus] = Column(
        Enum(TeamJoinRequestStatus),
        default=TeamJoinRequestStatus.PENDING,
        nullable=False,
        comment="申请状态",
    )
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, default=func.now(), nullable=False, comment="申请时间"
    )
    reviewed_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, nullable=True, comment="处理时间"
    )
    reviewer_id: Mapped[int | None] = Column(
        Integer, ForeignKey("users.id"), nullable=True, comment="审核人ID"
    )

    team: Mapped[Team] = relationship("Team", back_populates="join_requests")
    applicant: Mapped[User] = relationship("User", foreign_keys=[user_id])
    reviewer: Mapped[User | None] = relationship("User", foreign_keys=[reviewer_id])


class TeamInvitation(Base):
    __tablename__ = "team_invitations"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="记录ID"
    )
    team_id: Mapped[int] = Column(
        Integer, ForeignKey("teams.id"), nullable=False, comment="团队ID"
    )
    inviter_id: Mapped[int] = Column(
        Integer, ForeignKey("users.id"), nullable=False, comment="邀请人ID"
    )
    invitee_email: Mapped[typing.Any] = Column(
        String(160), nullable=False, comment="受邀人邮箱"
    )
    invitee_user_id: Mapped[int | None] = Column(
        Integer, ForeignKey("users.id"), nullable=True, comment="受邀用户ID"
    )
    role: Mapped[TeamMembershipRole] = Column(
        Enum(TeamMembershipRole),
        default=TeamMembershipRole.MEMBER,
        nullable=False,
        comment="邀请角色",
    )
    status: Mapped[TeamInvitationStatus] = Column(
        Enum(TeamInvitationStatus),
        default=TeamInvitationStatus.PENDING,
        nullable=False,
        comment="邀请状态",
    )
    token: Mapped[typing.Any] = Column(
        String(120), unique=True, nullable=False, comment="邀请令牌"
    )
    message: Mapped[str | None] = Column(Text, nullable=True, comment="邀请信息")
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )
    expires_at: Mapped[datetime_types.datetime] = Column(
        DateTime,
        default=lambda: datetime.utcnow() + timedelta(days=7),
        nullable=False,
        comment="过期时间",
    )
    responded_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, nullable=True, comment="回应时间"
    )

    team: Mapped[Team] = relationship("Team", back_populates="invitations")
    inviter: Mapped[User] = relationship("User", foreign_keys=[inviter_id])
    invitee: Mapped[User | None] = relationship("User", foreign_keys=[invitee_user_id])
