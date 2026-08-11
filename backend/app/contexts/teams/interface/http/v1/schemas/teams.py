"""Team lifecycle and summary HTTP schemas."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


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
