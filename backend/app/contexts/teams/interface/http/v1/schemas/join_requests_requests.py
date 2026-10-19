"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from . import TeamJoinRequestCreate, TeamJoinRequestReviewRequest


class RequestApplyToTeam(TeamJoinRequestCreate):
    team_id: int = Field(...)


class RequestListTeamJoinRequests(BaseModel):
    team_id: int = Field(...)
    status: str | None = Field(None)


class RequestReviewTeamJoinRequest(TeamJoinRequestReviewRequest):
    team_id: int = Field(...)
    request_id: int = Field(...)


class RequestCancelTeamJoinRequest(BaseModel):
    team_id: int = Field(...)
    request_id: int = Field(...)
