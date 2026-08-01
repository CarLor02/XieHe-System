"""Infrastructure ports required by team application flows."""

from __future__ import annotations

from typing import Any, Protocol

from app.contexts.teams.domain import (
    InvitationResponseSnapshot,
    InvitationSnapshot,
    JoinRequestSnapshot,
    JoinRequestStatus,
    TeamMembersSnapshot,
    TeamSearchQuery,
    TeamSummarySnapshot,
)


class TeamRepository(Protocol):
    async def search(self, query: TeamSearchQuery) -> list[TeamSummarySnapshot]: ...

    async def list_for_user(self, user_id: int) -> list[TeamSummarySnapshot]: ...

    async def get_members(
        self, team_id: int, viewer_id: int
    ) -> TeamMembersSnapshot: ...

    async def create(
        self, creator_id: int, data: dict[str, Any]
    ) -> TeamSummarySnapshot: ...

    async def update(
        self, team_id: int, operator_id: int, data: dict[str, Any]
    ) -> TeamSummarySnapshot: ...

    async def apply_to_join(
        self, team_id: int, user_id: int, message: str | None
    ) -> JoinRequestSnapshot: ...

    async def list_join_requests(
        self,
        team_id: int,
        reviewer_id: int,
        status: JoinRequestStatus | None,
    ) -> list[JoinRequestSnapshot]: ...

    async def review_join_request(
        self,
        team_id: int,
        request_id: int,
        reviewer_id: int,
        decision: str,
    ) -> JoinRequestSnapshot: ...

    async def cancel_join_request(
        self, team_id: int, request_id: int, user_id: int
    ) -> JoinRequestSnapshot: ...

    async def update_member_role(
        self,
        team_id: int,
        operator_id: int,
        target_user_id: int,
        role: str,
    ) -> None: ...

    async def remove_member(
        self, team_id: int, operator_id: int, target_user_id: int
    ) -> None: ...

    async def invite_member(
        self,
        team_id: int,
        inviter_id: int,
        email: str,
        role: str,
        message: str | None,
    ) -> InvitationSnapshot: ...

    async def list_invitations(self, user_id: int) -> list[InvitationSnapshot]: ...

    async def respond_to_invitation(
        self, invitation_id: int, user_id: int, accept: bool
    ) -> InvitationResponseSnapshot: ...
