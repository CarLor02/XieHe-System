"""Team membership mutation workflows."""

from .ports import TeamMembershipRepository
from .query_cache import TeamQueryCache


class TeamMembershipService:
    def __init__(
        self,
        repository: TeamMembershipRepository,
        *,
        cache: TeamQueryCache | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or TeamQueryCache()

    async def update_member_role(
        self,
        team_id: int,
        operator_id: int,
        target_user_id: int,
        role: str,
    ) -> None:
        await self._repository.update_member_role(
            team_id, operator_id, target_user_id, role
        )
        await self._cache.invalidate()

    async def remove_member(
        self, team_id: int, operator_id: int, target_user_id: int
    ) -> None:
        await self._repository.remove_member(team_id, operator_id, target_user_id)
        await self._cache.invalidate()
