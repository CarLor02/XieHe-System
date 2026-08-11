"""Team lifecycle persistence port."""

from typing import Any, Protocol

from app.contexts.teams.domain import TeamSummarySnapshot


class TeamManagementRepository(Protocol):
    async def create(
        self, creator_id: int, data: dict[str, Any]
    ) -> TeamSummarySnapshot: ...

    async def update(
        self, team_id: int, operator_id: int, data: dict[str, Any]
    ) -> TeamSummarySnapshot: ...
