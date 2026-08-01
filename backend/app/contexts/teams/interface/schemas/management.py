"""HTTP schemas for team collaboration workflows."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeamSummary(BaseModel):
    id: int
    name: str
    description: str | None = None
    hospital: str | None = None
    department: str | None = None
    creator_name: str | None = None
    member_count: int = 0
    max_members: int | None = None
    is_member: bool = False
    my_role: str | None = None
    my_status: str | None = None
    is_creator: bool = False
    join_status: str | None = None
    join_request_id: int | None = None
    created_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TeamMember(BaseModel):
    user_id: int
    username: str
    real_name: str | None = None
    email: str | None = None
    role: str
    status: str
    department: str | None = None
    is_creator: bool = False
    is_system_admin: bool = False
    system_admin_level: int = 0
    joined_at: datetime | None = None


class TeamCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: str | None = Field(None, max_length=1000)
    hospital: str | None = Field(None, max_length=120)
    department: str | None = Field(None, max_length=120)
    max_members: int | None = Field(50, ge=1, le=500)


class TeamUpdateRequest(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    description: str | None = Field(None, max_length=1000)
    hospital: str | None = Field(None, max_length=120)
    department: str | None = Field(None, max_length=120)
    max_members: int | None = Field(None, ge=1, le=500)


class TeamJoinRequestCreate(BaseModel):
    message: str | None = None


class TeamJoinRequestItem(BaseModel):
    id: int
    team_id: int
    applicant_id: int
    applicant_username: str
    applicant_real_name: str | None = None
    applicant_email: str | None = None
    message: str
    status: str
    requested_at: datetime
    reviewed_at: datetime | None = None
    reviewer_id: int | None = None


class TeamJoinRequestReviewRequest(BaseModel):
    decision: Literal["approve", "reject"]


class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: str = "MEMBER"
    message: str | None = None


class MemberRoleUpdateRequest(BaseModel):
    role: Literal["ADMIN", "MEMBER"]


class TeamInvitationItem(BaseModel):
    id: int
    team_id: int
    team_name: str | None = None
    team_description: str | None = None
    inviter_id: int
    inviter_name: str | None = None
    role: str
    message: str | None = None
    created_at: datetime
    expires_at: datetime
    status: str


class TeamInvitationRespondRequest(BaseModel):
    accept: bool
