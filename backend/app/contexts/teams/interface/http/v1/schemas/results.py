"""团队用例的成功数据，信封由 HTTP 公共层提供。"""

from datetime import datetime

from pydantic import BaseModel

from app.contexts.teams.domain import JoinRequestStatus

from .invitations import TeamInvitationItem
from .join_requests import TeamJoinRequestItem
from .members import TeamMember
from .teams import TeamSummary


class TeamSearchResult(BaseModel):
    results: list[TeamSummary]
    total: int


class MyTeamsResult(BaseModel):
    items: list[TeamSummary]
    total: int


class TeamMembersResult(BaseModel):
    team: TeamSummary
    members: list[TeamMember]


class InviteTeamMemberResult(BaseModel):
    status: str
    invitation_id: int
    invitee_email: str
    expires_at: datetime


class MyInvitationsResult(BaseModel):
    items: list[TeamInvitationItem]
    total: int


class InvitationRespondResult(BaseModel):
    message: str
    status: str
    team_id: int
    team_name: str


class ApplyToTeamResult(BaseModel):
    request_id: int
    status: str
    requested_at: datetime


class TeamJoinRequestsResult(BaseModel):
    items: list[TeamJoinRequestItem]
    total: int
    pending_count: int


class TeamJoinRequestActionResult(BaseModel):
    status: JoinRequestStatus
    request: TeamJoinRequestItem
