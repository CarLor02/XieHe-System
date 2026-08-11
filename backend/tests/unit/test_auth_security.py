"""访问控制应用用例与安全适配器单元测试。"""

from __future__ import annotations

from dataclasses import replace
from datetime import timedelta
from typing import Any

import pytest

from app.contexts.access_control.application import AuthenticationService
from app.contexts.access_control.domain import AuthenticatedIdentity
from app.contexts.access_control.infrastructure import security as security_module
from app.contexts.access_control.infrastructure.security import (
    SecurityManager,
    hash_password,
    hash_password_async,
    security_manager,
    verify_password,
    verify_password_async,
)
from app.contexts.access_control.interface.http.v1.schemas.auth import UserRegister
from app.shared.redis import RedisStateUnavailable


class InMemoryStateStore:
    def __init__(self) -> None:
        self.values: dict[str, Any] = {}

    async def set(self, key: str, value: Any, *, ttl: int) -> bool:
        del ttl
        self.values[key] = value
        return True

    async def get(self, key: str) -> Any:
        return self.values.get(key)

    async def exists(self, key: str) -> bool:
        return key in self.values

    async def delete(self, key: str) -> int:
        return int(self.values.pop(key, None) is not None)


@pytest.fixture(autouse=True)
def fake_security_cache(monkeypatch: pytest.MonkeyPatch) -> InMemoryStateStore:
    cache = InMemoryStateStore()
    monkeypatch.setattr(security_manager, "state_store", cache)
    return cache


def identity(**changes: Any) -> AuthenticatedIdentity:
    base = AuthenticatedIdentity(
        id=7,
        username="doctor",
        email="doctor@example.com",
        full_name="张三",
        password_hash="old-hash",
        is_active=True,
        is_superuser=False,
        is_system_admin=False,
        system_admin_level=0,
        roles=("doctor",),
        permissions=("patient_manage", "image_manage"),
    )
    return replace(base, **changes)


class MemoryIdentityRepository:
    def __init__(self, current: AuthenticatedIdentity | None = None) -> None:
        self.current = current
        self.created_phone: str | None = "unset"
        self.updated_password: tuple[int, str] | None = None

    def find_active_by_login(self, login: str) -> AuthenticatedIdentity | None:
        if self.current and login in {self.current.username, self.current.email}:
            return self.current
        return None

    def find_active_by_id(self, user_id: int) -> AuthenticatedIdentity | None:
        return self.current if self.current and self.current.id == user_id else None

    def create_user(self, **values: Any) -> AuthenticatedIdentity:
        self.created_phone = values["phone"]
        self.current = identity(
            username=values["username"],
            email=values["email"],
            full_name=values["full_name"],
            password_hash=values["password_hash"],
        )
        return self.current

    def update_password(self, user_id: int, password_hash: str) -> bool:
        if not self.current or self.current.id != user_id:
            return False
        self.updated_password = (user_id, password_hash)
        self.current = replace(self.current, password_hash=password_hash)
        return True


class FakePasswordHasher:
    async def hash(self, password: str) -> str:
        return f"hash:{password}"

    async def verify(self, plain_password: str, hashed_password: str) -> bool:
        return hashed_password in {f"hash:{plain_password}", "old-hash"} and (
            plain_password == "old-password" or hashed_password != "old-hash"
        )


class CaptureTokenManager:
    def __init__(self) -> None:
        self.access_expiry: timedelta | None = None
        self.refresh_expiry: timedelta | None = None
        self.refresh_payload: dict[str, Any] | None = None
        self.api_keys: dict[str, dict[str, Any]] = {}

    def create_access_token(
        self, data: dict[str, Any], expires_delta: timedelta | None = None
    ) -> str:
        self.access_expiry = expires_delta
        return "access-token"

    async def create_refresh_token(
        self, data: dict[str, Any], expires_delta: timedelta | None = None
    ) -> str:
        self.refresh_expiry = expires_delta
        return "refresh-token"

    async def verify_token(
        self, token: str, token_type: str = "access"
    ) -> dict[str, Any] | None:
        del token, token_type
        return self.refresh_payload

    async def blacklist_token(self, token: str, ttl: int | None = None) -> bool:
        del token, ttl
        return True

    async def generate_api_key(self, user_id: str, name: str = "default") -> str:
        token = "reset-token"
        self.api_keys[token] = {"user_id": user_id, "name": name}
        return token

    async def verify_api_key(self, api_key: str) -> dict[str, Any] | None:
        return self.api_keys.get(api_key)

    async def revoke_api_key(self, api_key: str) -> bool:
        return self.api_keys.pop(api_key, None) is not None


def auth_service(
    repository: MemoryIdentityRepository, token_manager: CaptureTokenManager
) -> AuthenticationService:
    return AuthenticationService(repository, FakePasswordHasher(), token_manager)


def test_register_phone_is_optional_and_nullable() -> None:
    payload = {
        "username": "doctor",
        "email": "doctor@example.com",
        "password": "secret123",
        "confirm_password": "secret123",
        "full_name": "张三",
    }
    assert UserRegister.model_fields["phone"].is_required() is False
    assert UserRegister(**payload).phone is None
    assert UserRegister(**{**payload, "phone": None}).phone is None


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("phone", "expected"),
    [(None, None), ("", None), ("   ", None), ("13800138000", "13800138000")],
)
async def test_register_normalizes_empty_phone(
    phone: str | None, expected: str | None
) -> None:
    repository = MemoryIdentityRepository()
    await auth_service(repository, CaptureTokenManager()).register(
        username="newdoctor",
        email="newdoctor@example.com",
        password="secret123",
        confirm_password="secret123",
        full_name="张三",
        phone=phone,
    )
    assert repository.created_phone == expected


@pytest.mark.asyncio
async def test_login_remember_me_uses_thirty_day_refresh_expiry() -> None:
    repository = MemoryIdentityRepository(identity(password_hash="hash:secret123"))
    token_manager = CaptureTokenManager()
    _, tokens = await auth_service(repository, token_manager).login(
        username="doctor", password="secret123", remember_me=True
    )
    assert tokens.refresh_token == "refresh-token"
    assert token_manager.refresh_expiry == timedelta(days=30)


@pytest.mark.asyncio
async def test_refresh_reloads_admin_claims() -> None:
    repository = MemoryIdentityRepository(
        identity(
            id=94,
            username="admin",
            is_superuser=True,
            is_system_admin=True,
            system_admin_level=1,
            roles=("admin",),
            permissions=("user_manage", "patient_manage", "system_manage"),
        )
    )
    token_manager = CaptureTokenManager()
    token_manager.refresh_payload = {"user_id": 94, "remember_me": False}
    await auth_service(repository, token_manager).refresh("old-refresh")
    assert token_manager.refresh_expiry == timedelta(days=7)


@pytest.mark.asyncio
async def test_change_password_updates_current_user_hash() -> None:
    repository = MemoryIdentityRepository(identity())
    await auth_service(repository, CaptureTokenManager()).change_password(
        principal={"id": 7, "username": "doctor"},  # type: ignore[typeddict-item]
        current_password="old-password",
        new_password="new-password",
        confirm_password="new-password",
    )
    assert repository.updated_password == (7, "hash:new-password")


@pytest.mark.asyncio
async def test_password_reset_updates_hash_and_revokes_one_time_token() -> None:
    repository = MemoryIdentityRepository(identity())
    token_manager = CaptureTokenManager()
    service = auth_service(repository, token_manager)
    token = await service.request_password_reset("doctor@example.com")
    assert token == "reset-token"
    await service.confirm_password_reset(
        token=token, new_password="new-password", confirm_password="new-password"
    )
    assert repository.updated_password == (7, "hash:new-password")
    assert token not in token_manager.api_keys


class TestPasswordSecurity:
    def test_password_hashing_and_verification(self) -> None:
        password = "test123456"
        hashed = hash_password(password)
        assert hashed != password
        assert hashed.startswith("$2b$")
        assert verify_password(password, hashed) is True
        assert verify_password("wrongpassword", hashed) is False

    @pytest.mark.asyncio
    async def test_async_password_helpers_use_threadpool(
        self, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        calls: list[Any] = []

        async def fake_to_thread(function: Any, *args: Any) -> Any:
            calls.append(function)
            return function(*args)

        monkeypatch.setattr(security_module.asyncio, "to_thread", fake_to_thread)
        hashed = await hash_password_async("AsyncPassword123!")
        assert await verify_password_async("AsyncPassword123!", hashed) is True
        assert calls == [security_module.hash_password, security_module.verify_password]


class TestTokenSecurity:
    @pytest.mark.asyncio
    async def test_access_refresh_verification_and_blacklist(self) -> None:
        access_token = security_manager.create_access_token(user_data())
        refresh_token = await security_manager.create_refresh_token(user_data())
        access_payload = await security_manager.verify_token(access_token)
        refresh_payload = await security_manager.verify_token(refresh_token, "refresh")
        assert access_payload and access_payload["type"] == "access"
        assert refresh_payload and refresh_payload["type"] == "refresh"
        assert await security_manager.blacklist_token(access_token) is True
        assert await security_manager.verify_token(access_token) is None

    @pytest.mark.asyncio
    async def test_invalid_token_is_rejected(self) -> None:
        assert await security_manager.verify_token("invalid.token.here") is None
        assert await security_manager.verify_token("") is None
        assert await security_manager.verify_token(None) is None  # type: ignore[arg-type]

    @pytest.mark.asyncio
    async def test_state_store_failure_fails_closed(self) -> None:
        class FailingStateStore(InMemoryStateStore):
            async def exists(self, key: str) -> bool:
                raise RedisStateUnavailable("state unavailable")

        manager = SecurityManager(FailingStateStore())
        token = manager.create_access_token(user_data())
        with pytest.raises(RedisStateUnavailable):
            await manager.verify_token(token)

    @pytest.mark.asyncio
    async def test_api_key_lifecycle(self) -> None:
        api_key = await security_manager.generate_api_key("test_user", "test_purpose")
        info = await security_manager.verify_api_key(api_key)
        assert info and info["user_id"] == "test_user"
        assert await security_manager.revoke_api_key(api_key) is True
        assert await security_manager.verify_api_key(api_key) is None


def user_data() -> dict[str, Any]:
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
