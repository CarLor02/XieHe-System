"""Team invitation application workflows."""

from typing import Any

from .ports import TeamInvitationRepository
from .query_cache import TeamQueryCache


class TeamInvitationService:
    def __init__(
        self,
        repository: TeamInvitationRepository,
        *,
        cache: TeamQueryCache | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or TeamQueryCache()

    async def invite_member(
        self,
        team_id: int,
        inviter_id: int,
        email: str,
        role: str,
        message: str | None,
    ) -> dict[str, Any]:
        result = await self._repository.invite_member(
            team_id, inviter_id, email, role, message
        )
        await self._cache.invalidate()
        return result.to_json_dict()

    async def list_invitations(self, user_id: int) -> list[dict[str, Any]]:
        return [
            item.to_json_dict()
            for item in await self._repository.list_invitations(user_id)
        ]

    async def respond_to_invitation(
        self, invitation_id: int, user_id: int, accept: bool
    ) -> dict[str, Any]:
        result = await self._repository.respond_to_invitation(
            invitation_id, user_id, accept
        )
        await self._cache.invalidate()
        return result.to_json_dict()
