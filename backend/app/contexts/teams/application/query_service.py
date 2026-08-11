"""Cached team discovery and membership queries."""

from typing import Any

from app.contexts.teams.domain import TeamSearchQuery
from app.shared.cache.keys import build_cache_key

from .ports import TeamQueryRepository
from .query_cache import TeamQueryCache


class TeamQueryService:
    def __init__(
        self,
        repository: TeamQueryRepository,
        *,
        cache: TeamQueryCache | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or TeamQueryCache()

    async def search_teams(
        self, keyword: str | None, current_user_id: int, limit: int
    ) -> list[dict[str, Any]]:
        query = TeamSearchQuery(keyword, current_user_id, limit)
        generation = await self._cache.generation()
        key = build_cache_key(
            "teams",
            "search",
            f"v{generation}",
            parameters=query.cache_parameters(),
        )

        async def load() -> list[dict[str, Any]]:
            items = await self._repository.search(query)
            return [item.to_json_dict() for item in items]

        return await self._cache.get_or_load(key, load)

    async def list_user_teams(self, user_id: int) -> list[dict[str, Any]]:
        generation = await self._cache.generation()
        key = build_cache_key("teams", "mine", user_id, f"v{generation}")

        async def load() -> list[dict[str, Any]]:
            return [
                item.to_json_dict()
                for item in await self._repository.list_for_user(user_id)
            ]

        return await self._cache.get_or_load(key, load)

    async def get_team_members(self, team_id: int, viewer_id: int) -> dict[str, Any]:
        generation = await self._cache.generation()
        key = build_cache_key(
            "teams", "members", team_id, "viewer", viewer_id, f"v{generation}"
        )

        async def load() -> dict[str, Any]:
            result = await self._repository.get_members(team_id, viewer_id)
            return result.to_json_dict()

        return await self._cache.get_or_load(key, load)
