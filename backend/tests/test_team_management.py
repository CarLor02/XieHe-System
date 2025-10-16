"""团队管理接口测试"""

import os
from typing import Dict, Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.auth import get_current_active_user
from app.core.database import get_db
from app.main import app
from app.models.base import Base as ModelBase
from app.models.team import (
    Team,
    TeamInvitation,
    TeamMembership,
    TeamMembershipRole,
    TeamMembershipStatus,
)
from app.models.user import User

# 测试数据库
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_team_management.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

client = TestClient(app)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


def _create_user(db: Session, username: str, email: str, *, is_superuser: bool = False) -> User:
    user = User(
        username=username,
        email=email,
        password_hash="hashed_password",
        salt="salt",
        real_name=username,
        status="active",
        is_superuser=is_superuser,
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

    ModelBase.metadata.create_all(bind=engine)

    with TestingSessionLocal() as db:
        leader = _create_user(db, "leader", "leader@example.com", is_superuser=True)
        admin = _create_user(db, "admin", "admin@example.com")
        applicant = _create_user(db, "applicant", "applicant@example.com")

        team_primary = Team(
            name="测试团队一",
            description="这是第一个测试团队",
            hospital="协和医院",
            department="骨科",
            leader_id=leader.id,
            max_members=10,
        )
        db.add(team_primary)
        db.flush()

        membership_leader = TeamMembership(
            team_id=team_primary.id,
            user_id=leader.id,
            role=TeamMembershipRole.LEADER,
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
            leader_id=admin.id,
            max_members=8,
        )
        db.add(team_secondary)

        db.commit()

    payload = {
        "leader_id": leader.id,
        "admin_id": admin.id,
        "applicant_id": applicant.id,
        "team_primary_id": team_primary.id,
        "team_secondary_id": team_secondary.id,
    }

    yield payload

    ModelBase.metadata.drop_all(bind=engine)
    if os.path.exists("test_team_management.db"):
        os.remove("test_team_management.db")


def override_current_user_factory(user_id: int, username: str):
    async def _override():
        return {
            "id": user_id,
            "user_id": user_id,
            "username": username,
            "email": f"{username}@example.com",
            "roles": [],
            "permissions": [],
            "is_active": True,
        }

    return _override


class TestTeamManagementAPI:
    def test_list_my_teams(self, setup_database):
        app.dependency_overrides[get_current_active_user] = override_current_user_factory(
            setup_database["leader_id"], "leader"
        )

        response = client.get("/api/v1/permissions/teams/my")
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["name"] == "测试团队一"

    def test_search_teams(self, setup_database):
        app.dependency_overrides[get_current_active_user] = override_current_user_factory(
            setup_database["applicant_id"], "applicant"
        )

        response = client.get("/api/v1/permissions/teams/search", params={"keyword": "测试"})
        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 2
        assert any(team["name"] == "测试团队二" for team in data["results"])

    def test_apply_to_team(self, setup_database):
        app.dependency_overrides[get_current_active_user] = override_current_user_factory(
            setup_database["applicant_id"], "applicant"
        )

        response = client.post(
            f"/api/v1/permissions/teams/{setup_database['team_secondary_id']}/apply",
            json={"message": "希望加入团队"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"

        with TestingSessionLocal() as db:
            join_request = (
                db.query(TeamMembership)
                .filter(
                    TeamMembership.team_id == setup_database["team_secondary_id"],
                    TeamMembership.user_id == setup_database["applicant_id"],
                )
                .first()
            )
            assert join_request is None

    def test_list_team_members(self, setup_database):
        app.dependency_overrides[get_current_active_user] = override_current_user_factory(
            setup_database["leader_id"], "leader"
        )

        response = client.get(
            f"/api/v1/permissions/teams/{setup_database['team_primary_id']}/members"
        )
        assert response.status_code == 200
        data = response.json()
        assert data["team"]["name"] == "测试团队一"
        assert len(data["members"]) == 2
        assert any(member["role"] == "leader" for member in data["members"])

    def test_invite_member(self, setup_database):
        app.dependency_overrides[get_current_active_user] = override_current_user_factory(
            setup_database["leader_id"], "leader"
        )

        response = client.post(
            f"/api/v1/permissions/teams/{setup_database['team_primary_id']}/invite",
            json={"email": "applicant@example.com", "role": "member"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "pending"

        with TestingSessionLocal() as db:
            invitation_exists = (
                db.query(TeamInvitation)
                .filter(TeamInvitation.id == data["invitation_id"])
                .first()
            )
            assert invitation_exists is not None


# 恢复默认依赖
app.dependency_overrides.pop(get_current_active_user, None)
