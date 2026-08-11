"""Team query values and JSON-safe read snapshots."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime
from enum import Enum
from typing import Any


class TeamRole(str, Enum):
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class MembershipStatus(str, Enum):
    ACTIVE = "ACTIVE"
    INVITED = "INVITED"
    PENDING = "PENDING"
    INACTIVE = "INACTIVE"


class JoinRequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class InvitationStatus(str, Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    EXPIRED = "EXPIRED"
    REVOKED = "REVOKED"


def _json_datetime(value: datetime | None) -> str | None:
    return value.isoformat() if value else None


@dataclass(frozen=True, slots=True)
class TeamSearchQuery:
    keyword: str | None
    current_user_id: int
    limit: int

    def cache_parameters(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class TeamSummarySnapshot:
    id: int
    name: str
    description: str | None
    hospital: str | None
    department: str | None
    creator_name: str | None
    member_count: int
    max_members: int | None
    is_member: bool
    my_role: str | None
    my_status: str | None
    is_creator: bool
    join_status: str | None
    join_request_id: int | None
    created_at: datetime | None

    def to_json_dict(self) -> dict[str, Any]:
        result = asdict(self)
        result["created_at"] = _json_datetime(self.created_at)
        return result


@dataclass(frozen=True, slots=True)
class TeamMemberSnapshot:
    user_id: int
    username: str
    real_name: str | None
    email: str | None
    role: str
    status: str
    department: str | None
    is_creator: bool
    is_system_admin: bool
    system_admin_level: int
    joined_at: datetime | None

    def to_json_dict(self) -> dict[str, Any]:
        result = asdict(self)
        result["joined_at"] = _json_datetime(self.joined_at)
        return result


@dataclass(frozen=True, slots=True)
class TeamMembersSnapshot:
    team: TeamSummarySnapshot
    members: tuple[TeamMemberSnapshot, ...]

    def to_json_dict(self) -> dict[str, Any]:
        return {
            "team": self.team.to_json_dict(),
            "members": [member.to_json_dict() for member in self.members],
        }


@dataclass(frozen=True, slots=True)
class JoinRequestSnapshot:
    id: int
    team_id: int
    applicant_id: int
    applicant_username: str
    applicant_real_name: str | None
    applicant_email: str | None
    message: str
    status: str
    requested_at: datetime
    reviewed_at: datetime | None
    reviewer_id: int | None

    def to_json_dict(self) -> dict[str, Any]:
        result = asdict(self)
        result["requested_at"] = self.requested_at.isoformat()
        result["reviewed_at"] = _json_datetime(self.reviewed_at)
        return result


@dataclass(frozen=True, slots=True)
class InvitationSnapshot:
    id: int
    team_id: int
    team_name: str | None
    team_description: str | None
    inviter_id: int
    inviter_name: str | None
    invitee_email: str
    role: str
    message: str | None
    created_at: datetime
    expires_at: datetime
    status: str

    def to_json_dict(self) -> dict[str, Any]:
        result = asdict(self)
        result["created_at"] = self.created_at.isoformat()
        result["expires_at"] = self.expires_at.isoformat()
        return result


@dataclass(frozen=True, slots=True)
class InvitationResponseSnapshot:
    message: str
    status: str
    team_id: int
    team_name: str

    def to_json_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True, slots=True)
class TeamAccessSnapshot:
    id: int
    name: str
    description: str | None
    hospital: str | None
    department: str | None
    creator_name: str | None
    member_count: int
    max_members: int
    is_member: bool
    my_role: str | None
    my_status: str | None
    is_creator: bool
    created_at: datetime


@dataclass(frozen=True, slots=True)
class TeamAccessPage:
    items: tuple[TeamAccessSnapshot, ...]
    total: int
