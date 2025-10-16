"""团队管理相关的Pydantic模型"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class TeamSummary(BaseModel):
    """团队概要信息"""

    id: int
    name: str
    description: Optional[str] = None
    hospital: Optional[str] = None
    department: Optional[str] = None
    leader_name: Optional[str] = None
    member_count: int = 0
    max_members: Optional[int] = None
    is_member: bool = False
    join_status: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class TeamMember(BaseModel):
    """团队成员信息"""

    user_id: int = Field(..., alias="id")
    username: str
    real_name: Optional[str] = None
    email: Optional[str] = None
    role: str
    status: str
    department: Optional[str] = None
    is_leader: bool = False
    joined_at: Optional[datetime] = None

    model_config = ConfigDict(populate_by_name=True)


class TeamMembersResponse(BaseModel):
    """团队成员列表响应"""

    team: TeamSummary
    members: List[TeamMember]


class TeamJoinRequestCreate(BaseModel):
    """团队加入申请请求体"""

    message: Optional[str] = Field(None, description="申请说明")


class TeamJoinRequestResponse(BaseModel):
    """团队加入申请响应"""

    message: str
    status: str
    requested_at: datetime


class TeamInviteRequest(BaseModel):
    """团队邀请请求体"""

    email: EmailStr = Field(..., description="受邀人邮箱")
    role: str = Field("member", description="邀请的团队角色")
    message: Optional[str] = Field(None, description="附加邀请信息")


class TeamInviteResponse(BaseModel):
    """团队邀请响应"""

    message: str
    status: str
    invitation_id: int
    invitee_email: EmailStr
    expires_at: datetime


class TeamSearchResponse(BaseModel):
    """团队搜索结果响应"""

    results: List[TeamSummary]
    total: int


class TeamListResponse(BaseModel):
    """团队列表响应"""

    items: List[TeamSummary]
    total: int
