"""Join-request application workflows."""

from typing import Any

from app.contexts.teams.domain import JoinRequestStatus

from .ports import TeamJoinRequestRepository
from .query_cache import TeamQueryCache


class TeamJoinRequestService:
    def __init__(
        self,
        repository: TeamJoinRequestRepository,
        *,
        cache: TeamQueryCache | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or TeamQueryCache()

    async def apply_to_team(
        self, team_id: int, user_id: int, message: str | None
    ) -> dict[str, Any]:
        result = await self._repository.apply_to_join(team_id, user_id, message)
        await self._cache.invalidate()
        return result.to_json_dict()

    async def list_join_requests(
        self,
        team_id: int,
        reviewer_id: int,
        status: JoinRequestStatus | None,
    ) -> list[dict[str, Any]]:
        return [
            item.to_json_dict()
            for item in await self._repository.list_join_requests(
                team_id, reviewer_id, status
            )
        ]

    async def review_join_request(
        self,
        team_id: int,
        request_id: int,
        reviewer_id: int,
        decision: str,
    ) -> dict[str, Any]:
        result = await self._repository.review_join_request(
            team_id, request_id, reviewer_id, decision
        )
        await self._cache.invalidate()
        return result.to_json_dict()

    async def cancel_join_request(
        self, team_id: int, request_id: int, user_id: int
    ) -> dict[str, Any]:
        result = await self._repository.cancel_join_request(
            team_id, request_id, user_id
        )
        await self._cache.invalidate()
        return result.to_json_dict()
