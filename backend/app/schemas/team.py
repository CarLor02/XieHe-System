"""团队管理相关的Pydantic模型"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

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
    join_request_id: Optional[int] = None
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


class TeamCreateRequest(BaseModel):
    """创建团队请求体"""

    name: str = Field(..., min_length=2, max_length=120, description="团队名称")
    description: Optional[str] = Field(None, max_length=1000, description="团队描述")
    hospital: Optional[str] = Field(None, max_length=120, description="所属医院")
    department: Optional[str] = Field(None, max_length=120, description="所属科室")
    max_members: Optional[int] = Field(50, ge=1, le=500, description="最大成员数")


class TeamJoinRequestCreate(BaseModel):
    """团队加入申请请求体"""

    message: Optional[str] = Field(
        None,
        description="申请说明（可选）",
    )


class TeamJoinRequestResponse(BaseModel):
    """团队加入申请响应"""

    request_id: int
    message: str
    status: str
    requested_at: datetime


class TeamJoinRequestItem(BaseModel):
    """团队加入申请记录"""

    id: int
    team_id: int
    applicant_id: int
    applicant_username: str
    applicant_real_name: Optional[str] = None
    applicant_email: Optional[str] = None
    message: str
    status: str
    requested_at: datetime
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class TeamJoinRequestListResponse(BaseModel):
    """团队加入申请列表响应"""

    items: List[TeamJoinRequestItem]
    total: int
    pending_count: int


class TeamJoinRequestReviewRequest(BaseModel):
    """团队加入申请审核请求"""

    decision: Literal["approve", "reject"] = Field(
        ..., description="审核决策，approve表示通过，reject表示拒绝"
    )


class TeamJoinRequestReviewResponse(BaseModel):
    """团队加入申请审核响应"""

    message: str
    status: str
    request: TeamJoinRequestItem


class TeamInviteRequest(BaseModel):
    """团队邀请请求体"""

    email: EmailStr = Field(..., description="受邀人邮箱")
    role: str = Field("doctor", description="邀请的团队角色")
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
