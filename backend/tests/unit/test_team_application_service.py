from __future__ import annotations

from datetime import datetime, timedelta

import pytest

from app.contexts.teams.application import TeamApplicationService
from app.contexts.teams.domain import (
    InvitationResponseSnapshot,
    InvitationSnapshot,
    JoinRequestSnapshot,
    TeamMemberSnapshot,
    TeamMembersSnapshot,
    TeamSummarySnapshot,
)
from app.shared.cache.service import CacheAsideService, CacheGenerationService


def _team(team_id: int = 1) -> TeamSummarySnapshot:
    return TeamSummarySnapshot(
        id=team_id,
        name=f"团队{team_id}",
        description=None,
        hospital=None,
        department=None,
        creator_name="管理员",
        member_count=1,
        max_members=10,
        is_member=True,
        my_role="ADMIN",
        my_status="ACTIVE",
        is_creator=True,
        join_status=None,
        join_request_id=None,
        created_at=datetime(2026, 1, 1),
    )


def _join_request(request_id: int = 1) -> JoinRequestSnapshot:
    return JoinRequestSnapshot(
        id=request_id,
        team_id=1,
        applicant_id=2,
        applicant_username="applicant",
        applicant_real_name=None,
        applicant_email="applicant@example.com",
        message="",
        status="PENDING",
        requested_at=datetime(2026, 1, 1),
        reviewed_at=None,
        reviewer_id=None,
    )


def _invitation(invitation_id: int = 1) -> InvitationSnapshot:
    now = datetime(2026, 1, 1)
    return InvitationSnapshot(
        id=invitation_id,
        team_id=1,
        team_name="团队1",
        team_description=None,
        inviter_id=1,
        inviter_name="管理员",
        invitee_email="member@example.com",
        role="MEMBER",
        message=None,
        created_at=now,
        expires_at=now + timedelta(days=7),
        status="PENDING",
    )


class FakeTeamRepository:
    def __init__(self) -> None:
        self.search_calls = 0
        self.list_calls = 0
        self.member_calls = 0
        self.join_request_list_calls = 0
        self.invitation_list_calls = 0

    async def search(self, query):
        self.search_calls += 1
        return [_team(query.current_user_id)]

    async def list_for_user(self, user_id):
        self.list_calls += 1
        return [_team(user_id)]

    async def get_members(self, team_id, viewer_id):
        self.member_calls += 1
        return TeamMembersSnapshot(
            team=_team(team_id),
            members=(
                TeamMemberSnapshot(
                    user_id=viewer_id,
                    username="viewer",
                    real_name=None,
                    email=None,
                    role="ADMIN",
                    status="ACTIVE",
                    department=None,
                    is_creator=True,
                    is_system_admin=False,
                    system_admin_level=0,
                    joined_at=datetime(2026, 1, 1),
                ),
            ),
        )

    async def create(self, creator_id, data):
        return _team(creator_id)

    async def update(self, team_id, operator_id, data):
        return _team(team_id)

    async def apply_to_join(self, team_id, user_id, message):
        return _join_request()

    async def list_join_requests(self, team_id, reviewer_id, status):
        self.join_request_list_calls += 1
        return [_join_request()]

    async def review_join_request(self, team_id, request_id, reviewer_id, decision):
        return _join_request(request_id)

    async def cancel_join_request(self, team_id, request_id, user_id):
        return _join_request(request_id)

    async def update_member_role(self, team_id, operator_id, target_user_id, role):
        return None

    async def remove_member(self, team_id, operator_id, target_user_id):
        return None

    async def invite_member(self, team_id, inviter_id, email, role, message):
        return _invitation()

    async def list_invitations(self, user_id):
        self.invitation_list_calls += 1
        return [_invitation()]

    async def respond_to_invitation(self, invitation_id, user_id, accept):
        return InvitationResponseSnapshot(
            message="已处理",
            status="ACCEPTED",
            team_id=1,
            team_name="团队1",
        )


class MemoryCache:
    enabled = True

    def __init__(self) -> None:
        self.values: dict[str, object] = {}
        self.fail_reads = False
        self.fail_writes = False

    async def get(self, key):
        if self.fail_reads:
            raise ConnectionError("cache unavailable")
        return self.values.get(key)

    async def set(self, key, value, *, ttl):
        if self.fail_writes:
            raise ConnectionError("cache unavailable")
        self.values[key] = value
        return True

    async def delete(self, key):
        return int(self.values.pop(key, None) is not None)

    async def increment(self, key, amount=1):
        if self.fail_writes:
            raise ConnectionError("cache unavailable")
        current = self.values.get(key, 0)
        self.values[key] = (current if isinstance(current, int) else 0) + amount
        return self.values[key]


def _service(
    repository: FakeTeamRepository, cache: MemoryCache
) -> TeamApplicationService:
    return TeamApplicationService(
        repository,
        cache=CacheAsideService(cache),
        generations=CacheGenerationService(cache),
    )


@pytest.mark.asyncio
async def test_team_queries_are_cached_and_isolated_by_viewer() -> None:
    repository = FakeTeamRepository()
    service = _service(repository, MemoryCache())

    await service.search_teams("脊柱", 1, 20)
    await service.search_teams("脊柱", 1, 20)
    await service.search_teams("脊柱", 2, 20)
    assert repository.search_calls == 2

    await service.list_user_teams(1)
    await service.list_user_teams(1)
    await service.list_user_teams(2)
    assert repository.list_calls == 2

    await service.get_team_members(1, 1)
    await service.get_team_members(1, 1)
    await service.get_team_members(1, 2)
    assert repository.member_calls == 2


@pytest.mark.asyncio
async def test_workflow_queues_bypass_query_cache() -> None:
    repository = FakeTeamRepository()
    service = _service(repository, MemoryCache())

    await service.list_join_requests(1, 1, None)
    await service.list_join_requests(1, 1, None)
    await service.list_invitations(1)
    await service.list_invitations(1)

    assert repository.join_request_list_calls == 2
    assert repository.invitation_list_calls == 2


@pytest.mark.asyncio
async def test_every_team_write_invalidates_the_shared_query_generation() -> None:
    repository = FakeTeamRepository()
    cache = MemoryCache()
    service = _service(repository, cache)

    await service.create_team(1, {"name": "新团队"})
    await service.update_team(1, 1, {"name": "新名称"})
    await service.apply_to_team(1, 2, None)
    await service.review_join_request(1, 1, 1, "approve")
    await service.cancel_join_request(1, 1, 2)
    await service.update_member_role(1, 1, 2, "ADMIN")
    await service.remove_member(1, 1, 2)
    await service.invite_member(1, 1, "member@example.com", "MEMBER", None)
    await service.respond_to_invitation(1, 2, True)

    assert cache.values["generation:teams:queries"] == 9


@pytest.mark.asyncio
async def test_team_query_falls_back_to_repository_when_cache_fails() -> None:
    repository = FakeTeamRepository()
    cache = MemoryCache()
    cache.fail_reads = True
    cache.fail_writes = True
    service = _service(repository, cache)

    first = await service.search_teams(None, 1, 20)
    second = await service.search_teams(None, 1, 20)

    assert first == second
    assert repository.search_calls == 2
