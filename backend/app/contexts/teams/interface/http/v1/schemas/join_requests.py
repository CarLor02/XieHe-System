"""Team join-request HTTP schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel

from app.contexts.teams.domain import JoinRequestStatus


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
    status: JoinRequestStatus
    requested_at: datetime
    reviewed_at: datetime | None = None
    reviewer_id: int | None = None


class TeamJoinRequestReviewRequest(BaseModel):
    decision: Literal["approve", "reject"]
