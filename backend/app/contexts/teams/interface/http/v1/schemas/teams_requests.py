"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from . import TeamUpdateRequest


class RequestUpdateTeam(TeamUpdateRequest):
    team_id: int = Field(...)


class RequestSearchTeams(BaseModel):
    keyword: str | None = Field(None)
    limit: int = Field(20, ge=1, le=50)


class RequestListMyTeams(BaseModel):
    pass
