"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from . import MemberRoleUpdateRequest


class RequestListTeamMembers(BaseModel):
    team_id: int = Field(...)


class RequestUpdateTeamMemberRole(MemberRoleUpdateRequest):
    team_id: int = Field(...)
    user_id: int = Field(...)


class RequestRemoveTeamMember(BaseModel):
    team_id: int = Field(...)
    user_id: int = Field(...)
