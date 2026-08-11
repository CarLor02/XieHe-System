"""团队 Context 的异步仓储与应用流程集成测试。"""

from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace
from typing import AsyncIterator, Generator, cast

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from app.contexts.teams.application import (
    TeamInvitationService,
    TeamJoinRequestService,
    TeamManagementService,
    TeamQueryCache,
    TeamQueryService,
)
from app.contexts.teams.domain import (
    TeamConflict,
    TeamPermissionDenied,
    TeamValidationError,
)
from app.contexts.teams.infrastructure import (
    SqlAlchemyTeamInvitationRepository,
    SqlAlchemyTeamJoinRequestRepository,
    SqlAlchemyTeamManagementRepository,
    SqlAlchemyTeamQueryRepository,
)
from app.contexts.teams.infrastructure.persistence import (
    Team,
    TeamInvitation,
    TeamJoinRequestStatus,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)
from app.models.user import User
from app.shared.cache.service import CacheAsideService, CacheGenerationService
from tests.db import get_test_database_url

pytestmark = pytest.mark.database

TestingSessionLocal: sessionmaker | None = None


class DisabledCache:
    enabled = False

    async def get(self, key):
        return None

    async def set(self, key, value, *, ttl):
        return False

    async def delete(self, key):
        return 0

    async def increment(self, key, amount=1):
        return 0


def _async_database_url() -> str:
    return get_test_database_url().replace("mysql+pymysql://", "mysql+asyncmy://", 1)


@asynccontextmanager
async def _open_services() -> AsyncIterator[SimpleNamespace]:
    engine = create_async_engine(_async_database_url(), pool_pre_ping=True)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        async with factory() as session:
            cache = DisabledCache()
            coordinator = TeamQueryCache(
                CacheAsideService(cache),
                CacheGenerationService(cache),
            )
            yield SimpleNamespace(
                queries=TeamQueryService(
                    SqlAlchemyTeamQueryRepository(session), cache=coordinator
                ),
                management=TeamManagementService(
                    SqlAlchemyTeamManagementRepository(session), cache=coordinator
                ),
                join_requests=TeamJoinRequestService(
                    SqlAlchemyTeamJoinRequestRepository(session), cache=coordinator
                ),
                invitations=TeamInvitationService(
                    SqlAlchemyTeamInvitationRepository(session), cache=coordinator
                ),
            )
    finally:
        await engine.dispose()


def _open_session() -> Session:
    if TestingSessionLocal is None:
        raise RuntimeError("Test database session factory has not been initialized.")
    return cast(Session, TestingSessionLocal())


def _create_user(
    db: Session,
    username: str,
    email: str,
    *,
    is_superuser: bool = False,
    is_system_admin: bool = False,
    system_admin_level: int = 0,
) -> User:
    user = User(
        username=username,
        email=email,
        password_hash="hashed_password",
        salt="salt",
        real_name=username,
        status="active",
        is_superuser=is_superuser,
        is_system_admin=is_system_admin,
        system_admin_level=system_admin_level,
    )
    db.add(user)
    db.flush()
    return user


@pytest.fixture(autouse=True)
def setup_database(
    db_session: Session,
    test_session_factory: sessionmaker,
) -> Generator[dict[str, int], None, None]:
    global TestingSessionLocal
    TestingSessionLocal = test_session_factory

    leader = _create_user(
        db_session,
        "leader",
        "leader@example.com",
        is_superuser=True,
        is_system_admin=True,
        system_admin_level=1,
    )
    admin = _create_user(db_session, "admin", "admin@example.com")
    applicant = _create_user(db_session, "applicant", "applicant@example.com")

    team_primary = Team(
        name="测试团队一",
        description="这是第一个测试团队",
        hospital="协和医院",
        department="骨科",
        creator_id=leader.id,
        max_members=10,
    )
    db_session.add(team_primary)
    db_session.flush()
    db_session.add_all(
        [
            TeamMembership(
                team_id=team_primary.id,
                user_id=leader.id,
                role=TeamMembershipRole.ADMIN,
                status=TeamMembershipStatus.ACTIVE,
            ),
            TeamMembership(
                team_id=team_primary.id,
                user_id=admin.id,
                role=TeamMembershipRole.ADMIN,
                status=TeamMembershipStatus.ACTIVE,
            ),
        ]
    )

    team_secondary = Team(
        name="测试团队二",
        description="第二个测试团队",
        hospital="协和医院",
        department="影像科",
        creator_id=admin.id,
        max_members=8,
    )
    db_session.add(team_secondary)
    db_session.commit()

    payload = {
        "leader_id": leader.id,
        "admin_id": admin.id,
        "applicant_id": applicant.id,
        "team_primary_id": team_primary.id,
        "team_secondary_id": team_secondary.id,
    }
    yield payload
    TestingSessionLocal = None


class TestTeamContext:
    @pytest.mark.asyncio
    async def test_cached_query_repository_paths(self, setup_database):
        async with _open_services() as services:
            mine = await services.queries.list_user_teams(setup_database["admin_id"])
            results = await services.queries.search_teams(
                "测试", setup_database["applicant_id"], 20
            )
            members = await services.queries.get_team_members(
                setup_database["team_primary_id"], setup_database["leader_id"]
            )

        assert [item["name"] for item in mine] == ["测试团队一"]
        assert {item["name"] for item in results} == {"测试团队一", "测试团队二"}
        assert members["team"]["name"] == "测试团队一"
        assert len(members["members"]) == 2

    @pytest.mark.asyncio
    async def test_apply_review_and_cancel_join_requests(self, setup_database):
        async with _open_services() as services:
            approved = await services.join_requests.apply_to_team(
                setup_database["team_primary_id"],
                setup_database["applicant_id"],
                "希望加入测试团队",
            )
            requests = await services.join_requests.list_join_requests(
                setup_database["team_primary_id"], setup_database["leader_id"], None
            )
            reviewed = await services.join_requests.review_join_request(
                setup_database["team_primary_id"],
                approved["id"],
                setup_database["leader_id"],
                "approve",
            )

        assert any(item["id"] == approved["id"] for item in requests)
        assert reviewed["status"] == TeamJoinRequestStatus.APPROVED.value
        with _open_session() as db:
            membership = (
                db.query(TeamMembership)
                .filter_by(
                    team_id=setup_database["team_primary_id"],
                    user_id=setup_database["applicant_id"],
                )
                .one()
            )
            assert membership.status == TeamMembershipStatus.ACTIVE

        with _open_session() as db:
            membership = (
                db.query(TeamMembership)
                .filter_by(
                    team_id=setup_database["team_primary_id"],
                    user_id=setup_database["applicant_id"],
                )
                .one()
            )
            membership.status = TeamMembershipStatus.INACTIVE
            db.commit()
        async with _open_services() as services:
            pending = await services.join_requests.apply_to_team(
                setup_database["team_primary_id"],
                setup_database["applicant_id"],
                None,
            )
            cancelled = await services.join_requests.cancel_join_request(
                setup_database["team_primary_id"],
                pending["id"],
                setup_database["applicant_id"],
            )
            with pytest.raises(TeamValidationError):
                await services.join_requests.cancel_join_request(
                    setup_database["team_primary_id"],
                    pending["id"],
                    setup_database["applicant_id"],
                )
        assert cancelled["status"] == TeamJoinRequestStatus.CANCELLED.value

    @pytest.mark.asyncio
    async def test_create_and_update_team_permissions(self, setup_database):
        async with _open_services() as services:
            created = await services.management.create_team(
                setup_database["leader_id"],
                {
                    "name": "新建团队",
                    "description": "用于测试的团队",
                    "hospital": "协和医院",
                    "department": "放射科",
                    "max_members": 12,
                },
            )
            updated_by_system_admin = await services.management.update_team(
                setup_database["team_secondary_id"],
                setup_database["leader_id"],
                {"name": "系统管理员改名团队", "max_members": 18},
            )
            updated_by_team_admin = await services.management.update_team(
                setup_database["team_primary_id"],
                setup_database["admin_id"],
                {"name": "团队管理员改名团队", "max_members": 25},
            )

        assert created["member_count"] == 1
        assert updated_by_system_admin["name"] == "系统管理员改名团队"
        assert updated_by_team_admin["name"] == "团队管理员改名团队"

        with _open_session() as db:
            db.add(
                TeamMembership(
                    team_id=setup_database["team_primary_id"],
                    user_id=setup_database["applicant_id"],
                    role=TeamMembershipRole.MEMBER,
                    status=TeamMembershipStatus.ACTIVE,
                )
            )
            db.commit()
        async with _open_services() as services:
            with pytest.raises(TeamPermissionDenied):
                await services.management.update_team(
                    setup_database["team_primary_id"],
                    setup_database["applicant_id"],
                    {"name": "普通成员不能改名"},
                )
            with pytest.raises(TeamConflict):
                await services.management.update_team(
                    setup_database["team_primary_id"],
                    setup_database["leader_id"],
                    {"name": "系统管理员改名团队"},
                )
            with pytest.raises(TeamValidationError):
                await services.management.update_team(
                    setup_database["team_primary_id"],
                    setup_database["leader_id"],
                    {"max_members": 1},
                )

    @pytest.mark.asyncio
    async def test_invitation_round_trip(self, setup_database):
        async with _open_services() as services:
            invitation = await services.invitations.invite_member(
                setup_database["team_primary_id"],
                setup_database["leader_id"],
                "applicant@example.com",
                "MEMBER",
                None,
            )
            invitations = await services.invitations.list_invitations(
                setup_database["applicant_id"]
            )
            response = await services.invitations.respond_to_invitation(
                invitation["id"], setup_database["applicant_id"], True
            )

        assert any(item["id"] == invitation["id"] for item in invitations)
        assert response["status"] == "ACCEPTED"
        with _open_session() as db:
            stored = db.get(TeamInvitation, invitation["id"])
            membership = (
                db.query(TeamMembership)
                .filter_by(
                    team_id=setup_database["team_primary_id"],
                    user_id=setup_database["applicant_id"],
                )
                .one()
            )
            assert stored is not None
            assert membership.status == TeamMembershipStatus.ACTIVE
