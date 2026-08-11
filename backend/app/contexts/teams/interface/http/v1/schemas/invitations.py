"""Team invitation HTTP schemas."""

from datetime import datetime

from pydantic import BaseModel, EmailStr


class TeamInviteRequest(BaseModel):
    email: EmailStr
    role: str = "MEMBER"
    message: str | None = None


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
