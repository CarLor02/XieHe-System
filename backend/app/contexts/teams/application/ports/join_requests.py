"""Team join-request persistence port."""

from typing import Protocol

from app.contexts.teams.domain import JoinRequestSnapshot, JoinRequestStatus


class TeamJoinRequestRepository(Protocol):
    async def apply_to_join(
        self, team_id: int, user_id: int, message: str | None
    ) -> JoinRequestSnapshot: ...

    async def list_join_requests(
        self,
        team_id: int,
        reviewer_id: int,
        status: JoinRequestStatus | None,
    ) -> list[JoinRequestSnapshot]: ...

    async def review_join_request(
        self,
        team_id: int,
        request_id: int,
        reviewer_id: int,
        decision: str,
    ) -> JoinRequestSnapshot: ...

    async def cancel_join_request(
        self, team_id: int, request_id: int, user_id: int
    ) -> JoinRequestSnapshot: ...
