"""Cache-aware team commands and queries."""

from __future__ import annotations

from typing import Any

from app.contexts.teams.domain import JoinRequestStatus, TeamSearchQuery
from app.core.config import cache_settings
from app.shared.cache.aiocache import query_cache
from app.shared.cache.keys import build_cache_key
from app.shared.cache.service import CacheAsideService, CacheGenerationService

from .cache_namespaces import TEAM_QUERY_NAMESPACE
from .ports import TeamRepository


class TeamApplicationService:
    """The single application boundary for team collaboration workflows."""

    def __init__(
        self,
        repository: TeamRepository,
        *,
        cache: CacheAsideService | None = None,
        generations: CacheGenerationService | None = None,
    ) -> None:
        self._repository = repository
        self._cache = cache or CacheAsideService(query_cache)
        self._generations = generations or CacheGenerationService(query_cache)

    async def _query_generation(self) -> int:
        return await self._generations.current(TEAM_QUERY_NAMESPACE)

    async def _invalidate_queries(self) -> None:
        # The installation has few users, so one global generation provides a
        # simpler and safer invalidation boundary than per-user fan-out.
        await self._generations.bump_best_effort(TEAM_QUERY_NAMESPACE)

    async def search_teams(
        self, keyword: str | None, current_user_id: int, limit: int
    ) -> list[dict[str, Any]]:
        query = TeamSearchQuery(keyword, current_user_id, limit)
        generation = await self._query_generation()
        key = build_cache_key(
            "teams",
            "search",
            f"v{generation}",
            parameters=query.cache_parameters(),
        )

        async def load() -> list[dict[str, Any]]:
            items = await self._repository.search(query)
            return [item.to_json_dict() for item in items]

        return await self._cache.get_or_load(
            key,
            ttl=cache_settings.TEAM_QUERY_CACHE_TTL_SECONDS,
            loader=load,
        )

    async def list_user_teams(self, user_id: int) -> list[dict[str, Any]]:
        generation = await self._query_generation()
        key = build_cache_key("teams", "mine", user_id, f"v{generation}")

        async def load() -> list[dict[str, Any]]:
            return [
                item.to_json_dict()
                for item in await self._repository.list_for_user(user_id)
            ]

        return await self._cache.get_or_load(
            key,
            ttl=cache_settings.TEAM_QUERY_CACHE_TTL_SECONDS,
            loader=load,
        )

    async def get_team_members(self, team_id: int, viewer_id: int) -> dict[str, Any]:
        generation = await self._query_generation()
        key = build_cache_key(
            "teams", "members", team_id, "viewer", viewer_id, f"v{generation}"
        )

        async def load() -> dict[str, Any]:
            result = await self._repository.get_members(team_id, viewer_id)
            return result.to_json_dict()

        return await self._cache.get_or_load(
            key,
            ttl=cache_settings.TEAM_QUERY_CACHE_TTL_SECONDS,
            loader=load,
        )

    async def create_team(
        self, creator_id: int, data: dict[str, Any]
    ) -> dict[str, Any]:
        result = await self._repository.create(creator_id, data)
        await self._invalidate_queries()
        return result.to_json_dict()

    async def update_team(
        self, team_id: int, operator_id: int, data: dict[str, Any]
    ) -> dict[str, Any]:
        result = await self._repository.update(team_id, operator_id, data)
        await self._invalidate_queries()
        return result.to_json_dict()

    async def apply_to_team(
        self, team_id: int, user_id: int, message: str | None
    ) -> dict[str, Any]:
        result = await self._repository.apply_to_join(team_id, user_id, message)
        await self._invalidate_queries()
        return result.to_json_dict()

    async def list_join_requests(
        self,
        team_id: int,
        reviewer_id: int,
        status: JoinRequestStatus | None,
    ) -> list[dict[str, Any]]:
        # Workflow queues intentionally bypass cache.
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
        await self._invalidate_queries()
        return result.to_json_dict()

    async def cancel_join_request(
        self, team_id: int, request_id: int, user_id: int
    ) -> dict[str, Any]:
        result = await self._repository.cancel_join_request(
            team_id, request_id, user_id
        )
        await self._invalidate_queries()
        return result.to_json_dict()

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
        await self._invalidate_queries()

    async def remove_member(
        self, team_id: int, operator_id: int, target_user_id: int
    ) -> None:
        await self._repository.remove_member(team_id, operator_id, target_user_id)
        await self._invalidate_queries()

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
        await self._invalidate_queries()
        return result.to_json_dict()

    async def list_invitations(self, user_id: int) -> list[dict[str, Any]]:
        # Invitation expiry is time-based, so this workflow remains uncached.
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
        await self._invalidate_queries()
        return result.to_json_dict()
