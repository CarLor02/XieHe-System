"""Read port used by other contexts for team visibility decisions."""

from typing import Protocol

from app.contexts.teams.domain import TeamAccessPage


class TeamAccessRepository(Protocol):
    def list_active_admin_team_ids(self, user_id: int) -> set[int]: ...

    def find_assignable_active_team_ids(
        self,
        *,
        actor_id: int | None,
        unrestricted: bool,
        requested_team_ids: list[int],
    ) -> set[int]: ...

    def list_assignable(
        self,
        *,
        actor_id: int | None,
        unrestricted: bool,
        page: int,
        page_size: int,
        search: str | None,
    ) -> TeamAccessPage: ...
