"""Team member HTTP schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class TeamMember(BaseModel):
    user_id: int
    username: str
    real_name: str | None = None
    email: str | None = None
    role: str
    status: str
    department: str | None = None
    is_creator: bool = False
    is_system_admin: bool = False
    system_admin_level: int = 0
    joined_at: datetime | None = None


class MemberRoleUpdateRequest(BaseModel):
    role: Literal["ADMIN", "MEMBER"]
