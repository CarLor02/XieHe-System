"""Team invitation persistence port."""

from typing import Protocol

from app.contexts.teams.domain import InvitationResponseSnapshot, InvitationSnapshot


class TeamInvitationRepository(Protocol):
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
