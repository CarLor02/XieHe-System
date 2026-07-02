"""团队管理服务集成测试"""

from typing import Dict, Generator

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.models.team import (
    Team,
    TeamInvitation,
    TeamJoinRequestStatus,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)
from app.models.user import User
from app.services.team_service import team_service

pytestmark = pytest.mark.database

TestingSessionLocal: sessionmaker | None = None


def _open_session() -> Session:
    if TestingSessionLocal is None:
        raise RuntimeError("Test database session factory has not been initialized.")
    return TestingSessionLocal()


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
) -> Generator[Dict[str, int], None, None]:
    """重置数据库并插入基础数据"""

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

    leader_id = leader.id
    admin_id = admin.id
    applicant_id = applicant.id
    team_primary_id = team_primary.id

    membership_leader = TeamMembership(
        team_id=team_primary.id,
        user_id=leader.id,
        role=TeamMembershipRole.ADMIN,
        status=TeamMembershipStatus.ACTIVE,
    )
    membership_admin = TeamMembership(
        team_id=team_primary.id,
        user_id=admin.id,
        role=TeamMembershipRole.ADMIN,
        status=TeamMembershipStatus.ACTIVE,
    )
    db_session.add_all([membership_leader, membership_admin])

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

    team_secondary_id = team_secondary.id

    payload = {
        "leader_id": leader_id,
        "admin_id": admin_id,
        "applicant_id": applicant_id,
        "team_primary_id": team_primary_id,
        "team_secondary_id": team_secondary_id,
    }

    yield payload
    TestingSessionLocal = None


class TestTeamManagementService:
    def test_list_my_teams(self, setup_database):
        with _open_session() as db:
            items = team_service.list_user_teams(db, setup_database["admin_id"])

        assert len(items) == 1
        assert items[0]["name"] == "测试团队一"

    def test_search_teams(self, setup_database):
        with _open_session() as db:
            results = team_service.search_teams(db, "测试", setup_database["applicant_id"], 20)

        assert len(results) >= 2
        assert any(team["name"] == "测试团队二" for team in results)

    def test_apply_to_team(self, setup_database):
        with _open_session() as db:
            join_request = team_service.apply_to_join(
                db,
                setup_database["applicant_id"],
                setup_database["team_secondary_id"],
                "希望加入团队",
            )

        assert isinstance(join_request.id, int)
        assert join_request.status == TeamJoinRequestStatus.PENDING

        with _open_session() as db:
            membership = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == setup_database["team_secondary_id"],
                    TeamMembership.user_id == setup_database["applicant_id"],
                )
                .first()
            )
            assert membership is None

    def test_apply_to_team_without_message(self, setup_database):
        """测试无申请理由也可以成功申请"""
        with _open_session() as db:
            request_without_message = team_service.apply_to_join(
                db,
                setup_database["applicant_id"],
                setup_database["team_primary_id"],
                None,
            )
            request_with_blank_message = team_service.apply_to_join(
                db,
                setup_database["applicant_id"],
                setup_database["team_secondary_id"],
                "   ",
            )

        assert isinstance(request_without_message.id, int)
        assert request_without_message.status == TeamJoinRequestStatus.PENDING
        assert request_with_blank_message.status == TeamJoinRequestStatus.PENDING

    def test_join_requests_listing_and_approval(self, setup_database):
        # 申请加入团队
        with _open_session() as db:
            join_request = team_service.apply_to_join(
                db,
                setup_database["applicant_id"],
                setup_database["team_primary_id"],
                "希望加入测试团队",
            )
            request_id = join_request.id

            items = team_service.list_join_requests(
                db,
                setup_database["team_primary_id"],
                setup_database["leader_id"],
            )
            assert len(items) >= 1
            assert sum(1 for item in items if item["status"] == "PENDING") >= 1
            assert any(item["id"] == request_id for item in items)

            reviewed_request = team_service.review_join_request(
                db,
                setup_database["leader_id"],
                setup_database["team_primary_id"],
                request_id,
                "approve",
            )

        assert reviewed_request.status == TeamJoinRequestStatus.APPROVED
        assert reviewed_request.reviewer_id == setup_database["leader_id"]

        with _open_session() as db:
            membership = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == setup_database["team_primary_id"],
                    TeamMembership.user_id == setup_database["applicant_id"],
                )
                .first()
            )
            assert membership is not None
            assert membership.role == TeamMembershipRole.MEMBER
            assert membership.status == TeamMembershipStatus.ACTIVE

    def test_cancel_join_request(self, setup_database):
        """测试用户撤销自己的加入申请"""
        # 用户申请加入团队
        with _open_session() as db:
            join_request = team_service.apply_to_join(
                db,
                setup_database["applicant_id"],
                setup_database["team_primary_id"],
                "希望加入测试团队",
            )
            request_id = join_request.id

            cancelled_request = team_service.cancel_join_request(
                db,
                setup_database["applicant_id"],
                setup_database["team_primary_id"],
                request_id,
            )

        assert cancelled_request.status == TeamJoinRequestStatus.CANCELLED

        # 验证数据库中的状态
        with _open_session() as db:
            from app.models.team import TeamJoinRequest

            join_request = db.query(TeamJoinRequest).filter(TeamJoinRequest.id == request_id).first()
            assert join_request is not None
            assert join_request.status == TeamJoinRequestStatus.CANCELLED
            assert join_request.reviewer_id == setup_database["applicant_id"]  # 自己撤销的

        # 验证不能重复撤销
        with _open_session() as db:
            with pytest.raises(ValueError):
                team_service.cancel_join_request(
                    db,
                    setup_database["applicant_id"],
                    setup_database["team_primary_id"],
                    request_id,
                )

    def test_list_team_members(self, setup_database):
        with _open_session() as db:
            data = team_service.get_team_members(
                db,
                setup_database["team_primary_id"],
                setup_database["leader_id"],
            )

        assert data["team"]["name"] == "测试团队一"
        assert len(data["members"]) == 2
        assert any(member["role"] == "ADMIN" for member in data["members"])

    def test_create_team(self, setup_database):
        payload = {
            "name": "新建团队",
            "description": "用于测试的团队",
            "hospital": "协和医院",
            "department": "放射科",
            "max_members": 12,
        }

        with _open_session() as db:
            data = team_service.create_team(
                db,
                setup_database["leader_id"],
                **payload,
            )

        assert data["name"] == payload["name"]
        assert data["member_count"] == 1
        assert data["creator_name"] == "leader"

        with _open_session() as db:
            team = db.query(Team).filter(Team.name == payload["name"]).first()
            assert team is not None
            assert team.creator_id == setup_database["leader_id"]

            membership = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == team.id,
                    TeamMembership.user_id == setup_database["leader_id"],
                )
                .first()
            )
            assert membership is not None
            assert membership.role == TeamMembershipRole.ADMIN

    def test_system_admin_can_update_any_team(self, setup_database):
        with _open_session() as db:
            data = team_service.update_team(
                db,
                setup_database["leader_id"],
                setup_database["team_secondary_id"],
                name="系统管理员改名团队",
                description="系统管理员更新描述",
                hospital="新医院",
                department="新科室",
                max_members=18,
            )

        assert data["name"] == "系统管理员改名团队"
        assert data["description"] == "系统管理员更新描述"
        assert data["hospital"] == "新医院"
        assert data["department"] == "新科室"
        assert data["max_members"] == 18

    def test_team_admin_can_update_own_team(self, setup_database):
        with _open_session() as db:
            data = team_service.update_team(
                db,
                setup_database["admin_id"],
                setup_database["team_primary_id"],
                name="团队管理员改名团队",
                description="团队管理员更新描述",
                hospital="协和新院区",
                department="脊柱外科",
                max_members=25,
            )

        assert data["name"] == "团队管理员改名团队"
        assert data["description"] == "团队管理员更新描述"
        assert data["hospital"] == "协和新院区"
        assert data["department"] == "脊柱外科"
        assert data["max_members"] == 25

    def test_ordinary_member_cannot_update_team(self, setup_database):
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

            with pytest.raises(PermissionError):
                team_service.update_team(
                    db,
                    setup_database["applicant_id"],
                    setup_database["team_primary_id"],
                    name="普通成员不能改名",
                )

    def test_update_team_rejects_duplicate_name(self, setup_database):
        with _open_session() as db:
            with pytest.raises(ValueError, match="团队名称已存在"):
                team_service.update_team(
                    db,
                    setup_database["leader_id"],
                    setup_database["team_primary_id"],
                    name="测试团队二",
                )

    def test_update_team_rejects_max_members_less_than_active_members(self, setup_database):
        with _open_session() as db:
            with pytest.raises(ValueError, match="最大成员数不能小于当前成员数"):
                team_service.update_team(
                    db,
                    setup_database["leader_id"],
                    setup_database["team_primary_id"],
                    max_members=1,
                )

    def test_invite_member(self, setup_database):
        with _open_session() as db:
            invitation = team_service.invite_member(
                db,
                setup_database["leader_id"],
                setup_database["team_primary_id"],
                "applicant@example.com",
                "MEMBER",
            )

        assert invitation.status.value == "PENDING"

        with _open_session() as db:
            invitation_exists = (
                db.query(TeamInvitation)
                .filter(TeamInvitation.id == invitation.id)
                .first()
            )
            assert invitation_exists is not None
