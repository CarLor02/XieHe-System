"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from . import TeamInvitationRespondRequest, TeamInviteRequest


class RequestInviteTeamMember(TeamInviteRequest):
    team_id: int = Field(...)


class RequestGetMyInvitations(BaseModel):
    pass


class RequestRespondToInvitation(TeamInvitationRespondRequest):
    invitation_id: int = Field(...)
