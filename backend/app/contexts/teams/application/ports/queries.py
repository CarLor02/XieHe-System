"""Team query persistence port."""

from typing import Protocol

from app.contexts.teams.domain import (
    TeamMembersSnapshot,
    TeamSearchQuery,
    TeamSummarySnapshot,
)


class TeamQueryRepository(Protocol):
    async def search(self, query: TeamSearchQuery) -> list[TeamSummarySnapshot]: ...

    async def list_for_user(self, user_id: int) -> list[TeamSummarySnapshot]: ...

    async def get_members(
        self, team_id: int, viewer_id: int
    ) -> TeamMembersSnapshot: ...
