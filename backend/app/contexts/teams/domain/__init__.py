"""Team domain types, rules, and failures."""

from .errors import (
    InvitationNotFound,
    JoinRequestNotFound,
    TeamConflict,
    TeamDomainError,
    TeamNotFound,
    TeamPermissionDenied,
    TeamUserNotFound,
    TeamValidationError,
)
from .models import (
    InvitationResponseSnapshot,
    InvitationSnapshot,
    InvitationStatus,
    JoinRequestSnapshot,
    JoinRequestStatus,
    MembershipStatus,
    TeamMemberSnapshot,
    TeamMembersSnapshot,
    TeamRole,
    TeamSearchQuery,
    TeamSummarySnapshot,
)
from .rules import normalize_team_name, normalize_team_role, require_user_id

__all__ = [
    "InvitationNotFound",
    "InvitationResponseSnapshot",
    "InvitationSnapshot",
    "InvitationStatus",
    "JoinRequestNotFound",
    "JoinRequestSnapshot",
    "JoinRequestStatus",
    "MembershipStatus",
    "TeamConflict",
    "TeamDomainError",
    "TeamMemberSnapshot",
    "TeamMembersSnapshot",
    "TeamNotFound",
    "TeamPermissionDenied",
    "TeamRole",
    "TeamSearchQuery",
    "TeamSummarySnapshot",
    "TeamUserNotFound",
    "TeamValidationError",
    "normalize_team_name",
    "normalize_team_role",
    "require_user_id",
]
