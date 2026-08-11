"""Team membership mutation persistence port."""

from typing import Protocol


class TeamMembershipRepository(Protocol):
    async def update_member_role(
        self,
        team_id: int,
        operator_id: int,
        target_user_id: int,
        role: str,
    ) -> None: ...

    async def remove_member(
        self, team_id: int, operator_id: int, target_user_id: int
    ) -> None: ...
