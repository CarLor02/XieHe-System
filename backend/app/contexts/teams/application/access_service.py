"""Stable cross-context access boundary for team visibility facts."""

from app.contexts.teams.domain import TeamAccessPage

from .ports import TeamAccessRepository


class TeamAccessService:
    def __init__(self, repository: TeamAccessRepository) -> None:
        self._repository = repository

    def list_active_admin_team_ids(self, user_id: int) -> set[int]:
        return self._repository.list_active_admin_team_ids(user_id)

    def find_assignable_active_team_ids(
        self,
        *,
        actor_id: int | None,
        unrestricted: bool,
        requested_team_ids: list[int],
    ) -> set[int]:
        return self._repository.find_assignable_active_team_ids(
            actor_id=actor_id,
            unrestricted=unrestricted,
            requested_team_ids=requested_team_ids,
        )

    def list_assignable(
        self,
        *,
        actor_id: int | None,
        unrestricted: bool,
        page: int,
        page_size: int,
        search: str | None,
    ) -> TeamAccessPage:
        return self._repository.list_assignable(
            actor_id=actor_id,
            unrestricted=unrestricted,
            page=page,
            page_size=page_size,
            search=search,
        )
