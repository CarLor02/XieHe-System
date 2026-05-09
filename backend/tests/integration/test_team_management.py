"""团队管理服务集成测试"""

import os
from pathlib import Path
from typing import Dict, Generator

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

# 清理可能影响配置加载的环境变量
_settings_env_keys = {
    "MAX_FILE_SIZE",
    "API_HOST",
    "API_PORT",
    "API_DEBUG",
    "API_RELOAD",
    "JWT_ACCESS_TOKEN_EXPIRE_MINUTES",
    "JWT_REFRESH_TOKEN_EXPIRE_DAYS",
    "PASSWORD_HASH_ALGORITHM",
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_APP_NAME",
    "NEXT_PUBLIC_APP_VERSION",
    "ALLOWED_FILE_TYPES",
    "CORS_ORIGINS",
    "CORS_ALLOW_CREDENTIALS",
    "SECURITY_SECRET_KEY",
    "ENCRYPTION_KEY",
    "SESSION_TIMEOUT_MINUTES",
    "MAX_LOGIN_ATTEMPTS",
    "LOCKOUT_DURATION_MINUTES",
    "SSL_ENABLED",
    "SSL_CERT_PATH",
    "SSL_KEY_PATH",
    "BACKUP_ENABLED",
    "BACKUP_SCHEDULE",
    "BACKUP_RETENTION_DAYS",
}
for key in _settings_env_keys:
    os.environ.pop(key, None)

# 确保设置模块按 backend 工作目录加载本地配置
backend_root = Path(__file__).resolve().parents[2]
os.chdir(backend_root)

from app.models.base import Base as ModelBase
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

# 测试数据库
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_team_management.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    expire_on_commit=False,
)


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
def setup_database() -> Generator[Dict[str, int], None, None]:
    """重置数据库并插入基础数据"""

    # 清理旧数据库文件
    if os.path.exists("test_team_management.db"):
        os.remove("test_team_management.db")

    engine.dispose()
    ModelBase.metadata.create_all(bind=engine)

    with TestingSessionLocal() as db:
        leader = _create_user(
            db,
            "leader",
            "leader@example.com",
            is_superuser=True,
            is_system_admin=True,
            system_admin_level=1,
        )
        admin = _create_user(db, "admin", "admin@example.com")
        applicant = _create_user(db, "applicant", "applicant@example.com")

        team_primary = Team(
            name="测试团队一",
            description="这是第一个测试团队",
            hospital="协和医院",
            department="骨科",
            creator_id=leader.id,
            max_members=10,
        )
        db.add(team_primary)
        db.flush()

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
        db.add_all([membership_leader, membership_admin])

        team_secondary = Team(
            name="测试团队二",
            description="第二个测试团队",
            hospital="协和医院",
            department="影像科",
            creator_id=admin.id,
            max_members=8,
        )
        db.add(team_secondary)

        db.commit()

        team_secondary_id = team_secondary.id

    payload = {
        "leader_id": leader_id,
        "admin_id": admin_id,
        "applicant_id": applicant_id,
        "team_primary_id": team_primary_id,
        "team_secondary_id": team_secondary_id,
    }

    yield payload

    ModelBase.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists("test_team_management.db"):
        os.remove("test_team_management.db")


class TestTeamManagementService:
    def test_list_my_teams(self, setup_database):
        with TestingSessionLocal() as db:
            items = team_service.list_user_teams(db, setup_database["admin_id"])

        assert len(items) == 1
        assert items[0]["name"] == "测试团队一"

    def test_search_teams(self, setup_database):
        with TestingSessionLocal() as db:
            results = team_service.search_teams(db, "测试", setup_database["applicant_id"], 20)

        assert len(results) >= 2
        assert any(team["name"] == "测试团队二" for team in results)

    def test_apply_to_team(self, setup_database):
        with TestingSessionLocal() as db:
            join_request = team_service.apply_to_join(
                db,
                setup_database["applicant_id"],
                setup_database["team_secondary_id"],
                "希望加入团队",
            )

        assert isinstance(join_request.id, int)
        assert join_request.status == TeamJoinRequestStatus.PENDING

        with TestingSessionLocal() as db:
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
        with TestingSessionLocal() as db:
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
        with TestingSessionLocal() as db:
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

        with TestingSessionLocal() as db:
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
        with TestingSessionLocal() as db:
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
        with TestingSessionLocal() as db:
            from app.models.team import TeamJoinRequest

            join_request = db.query(TeamJoinRequest).filter(TeamJoinRequest.id == request_id).first()
            assert join_request is not None
            assert join_request.status == TeamJoinRequestStatus.CANCELLED
            assert join_request.reviewer_id == setup_database["applicant_id"]  # 自己撤销的

        # 验证不能重复撤销
        with TestingSessionLocal() as db:
            with pytest.raises(ValueError):
                team_service.cancel_join_request(
                    db,
                    setup_database["applicant_id"],
                    setup_database["team_primary_id"],
                    request_id,
                )

    def test_list_team_members(self, setup_database):
        with TestingSessionLocal() as db:
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

        with TestingSessionLocal() as db:
            data = team_service.create_team(
                db,
                setup_database["leader_id"],
                **payload,
            )

        assert data["name"] == payload["name"]
        assert data["member_count"] == 1
        assert data["creator_name"] == "leader"

        with TestingSessionLocal() as db:
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

    def test_invite_member(self, setup_database):
        with TestingSessionLocal() as db:
            invitation = team_service.invite_member(
                db,
                setup_database["leader_id"],
                setup_database["team_primary_id"],
                "applicant@example.com",
                "MEMBER",
            )

        assert invitation.status.value == "PENDING"

        with TestingSessionLocal() as db:
            invitation_exists = (
                db.query(TeamInvitation)
                .filter(TeamInvitation.id == invitation.id)
                .first()
            )
            assert invitation_exists is not None
