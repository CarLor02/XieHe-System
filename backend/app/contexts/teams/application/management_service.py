"""Team lifecycle commands."""

from typing import Any

from .ports import TeamManagementRepository
from .query_cache import TeamQueryCache


class TeamManagementService:
    def __init__(
        self,
        repository: TeamManagementRepository,
        *,
        cache: TeamQueryCache | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or TeamQueryCache()

    async def create_team(
        self, creator_id: int, data: dict[str, Any]
    ) -> dict[str, Any]:
        result = await self._repository.create(creator_id, data)
        await self._cache.invalidate()
        return result.to_json_dict()

    async def update_team(
        self, team_id: int, operator_id: int, data: dict[str, Any]
    ) -> dict[str, Any]:
        result = await self._repository.update(team_id, operator_id, data)
        await self._cache.invalidate()
        return result.to_json_dict()
