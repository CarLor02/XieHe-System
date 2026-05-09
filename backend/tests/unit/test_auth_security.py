"""Current authentication and token security unit tests."""

import jwt
import pytest

from app.api.v1.endpoints.access.handlers import auth as auth_handlers
from app.api.v1.endpoints.access.schemas.auth import TokenRefresh
from app.core.access.security import hash_password, security_manager, verify_password


class InMemoryCache:
    def __init__(self):
        self.values = {}

    def set(self, key, value, ttl=None, serialize="json"):
        self.values[key] = value
        return True

    def get(self, key, serialize="json"):
        return self.values.get(key)

    def exists(self, key):
        return key in self.values

    def delete(self, *keys):
        deleted = 0
        for key in keys:
            if key in self.values:
                del self.values[key]
                deleted += 1
        return deleted


@pytest.fixture(autouse=True)
def fake_security_cache(monkeypatch):
    cache = InMemoryCache()
    monkeypatch.setattr(security_manager, "cache_manager", cache)
    return cache


class FakeRefreshResult:
    def fetchone(self):
        return (
            94,
            "admin",
            "admin@xiehe.com",
            "系统管理员",
            "unused-password-hash",
            "active",
            1,
            1,
            1,
        )


class FakeRefreshDb:
    def __init__(self):
        self.executed_params = None

    def execute(self, sql, params):
        self.executed_params = params
        return FakeRefreshResult()


@pytest.mark.asyncio
async def test_refresh_token_reloads_active_user_and_preserves_admin_claims(monkeypatch):
    refresh_payload = {
        "sub": "admin",
        "username": "admin",
        "user_id": 94,
        "roles": ["admin"],
        "type": "refresh",
    }
    db = FakeRefreshDb()

    monkeypatch.setattr(
        auth_handlers.security_manager,
        "verify_token",
        lambda token, token_type="access": refresh_payload if token_type == "refresh" else None,
    )
    monkeypatch.setattr(
        auth_handlers.security_manager,
        "create_refresh_token",
        lambda data, expires_delta=None: "new-refresh-token",
    )

    response = await auth_handlers.refresh_token(
        TokenRefresh(refresh_token="old-refresh-token"),
        db=db,
    )

    assert db.executed_params == {"user_id": 94}
    tokens = response["data"]["tokens"]
    access_payload = jwt.decode(
        tokens["access_token"],
        security_manager.secret_key,
        algorithms=[security_manager.algorithm],
    )

    assert access_payload["user_id"] == 94
    assert access_payload["is_superuser"] is True
    assert access_payload["is_system_admin"] is True
    assert access_payload["system_admin_level"] == 1
    assert access_payload["permissions"] == [
        "user_manage",
        "patient_manage",
        "system_manage",
    ]


class TestPasswordSecurity:
    def test_password_hashing(self):
        password = "test123456"
        hashed = hash_password(password)

        assert hashed != password
        assert len(hashed) > 50
        assert hashed.startswith("$2b$")

    def test_password_verification(self):
        password = "test123456"
        hashed = hash_password(password)

        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False

    def test_password_hashes_use_unique_salts(self):
        password = "test123456"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    def test_access_token_creation(self):
        token = security_manager.create_access_token(user_data())

        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    def test_refresh_token_creation(self):
        token = security_manager.create_refresh_token(user_data())

        assert isinstance(token, str)
        assert len(token.split(".")) == 3

    def test_token_verification(self):
        access_token = security_manager.create_access_token(user_data())
        refresh_token = security_manager.create_refresh_token(user_data())

        access_payload = security_manager.verify_token(access_token)
        assert access_payload is not None
        assert access_payload["username"] == "testuser"
        assert access_payload["type"] == "access"

        refresh_payload = security_manager.verify_token(refresh_token, "refresh")
        assert refresh_payload is not None
        assert refresh_payload["username"] == "testuser"
        assert refresh_payload["type"] == "refresh"

    def test_invalid_token_verification(self):
        assert security_manager.verify_token("invalid.token.here") is None
        assert security_manager.verify_token("") is None
        assert security_manager.verify_token(None) is None


class TestTokenBlacklist:
    def test_token_blacklist_functionality(self):
        token = security_manager.create_access_token(user_data())

        assert security_manager.verify_token(token) is not None
        assert security_manager.blacklist_token(token) is True
        assert security_manager.is_token_blacklisted(token) is True
        assert security_manager.verify_token(token) is None


class TestAPIKeySecurity:
    def test_api_key_generation(self):
        api_key = security_manager.generate_api_key("test_user", "test_purpose")

        assert isinstance(api_key, str)
        assert len(api_key) > 20

    def test_api_key_verification(self):
        api_key = security_manager.generate_api_key("test_user", "test_purpose")

        key_info = security_manager.verify_api_key(api_key)

        assert key_info is not None
        assert key_info["user_id"] == "test_user"
        assert key_info["name"] == "test_purpose"

    def test_invalid_api_key_verification(self):
        assert security_manager.verify_api_key("invalid_api_key") is None
        assert security_manager.verify_api_key("") is None


def user_data():
    return {
        "sub": "testuser",
        "user_id": 1,
        "username": "testuser",
        "email": "test@example.com",
        "roles": ["user"],
        "permissions": ["read"],
        "is_active": True,
        "is_superuser": False,
    }
