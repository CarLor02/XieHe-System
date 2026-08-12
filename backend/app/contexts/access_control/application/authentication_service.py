"""登录、注册、令牌与密码应用用例。"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from app.contexts.access_control.domain import AuthenticatedIdentity
from app.core.config import settings
from app.core.system.exceptions import AuthenticationException, BusinessLogicException

from .dto import AccessPrincipal, TokenPair
from .ports import IdentityRepository, PasswordHasher, TokenManager


class AuthenticationService:
    def __init__(
        self,
        repository: IdentityRepository,
        password_hasher: PasswordHasher,
        token_manager: TokenManager,
    ) -> None:
        self._repository = repository
        self._password_hasher = password_hasher
        self._token_manager = token_manager

    async def login(
        self, *, username: str, password: str, remember_me: bool
    ) -> tuple[AuthenticatedIdentity, TokenPair]:
        identity = self._repository.find_active_by_login(username)
        if not identity or not await self._password_hasher.verify(
            password, identity.password_hash
        ):
            raise AuthenticationException("用户名或密码错误")
        if not identity.is_active:
            raise AuthenticationException("用户账户已被禁用")
        return identity, await self._create_tokens(identity, remember_me=remember_me)

    async def register(
        self,
        *,
        username: str,
        email: str,
        password: str,
        confirm_password: str,
        full_name: str,
        phone: str | None,
    ) -> AuthenticatedIdentity:
        if password != confirm_password:
            raise BusinessLogicException("密码和确认密码不匹配")
        if self._repository.find_active_by_login(username):
            raise BusinessLogicException("用户名已存在")
        if self._repository.find_active_by_login(email):
            raise BusinessLogicException("邮箱已被注册")
        normalized_phone = phone.strip() if phone else None
        normalized_phone = normalized_phone or None
        password_hash = await self._password_hasher.hash(password)
        return self._repository.create_user(
            username=username,
            email=email,
            phone=normalized_phone,
            full_name=full_name,
            password_hash=password_hash,
        )

    async def refresh(self, refresh_token: str) -> TokenPair:
        payload = await self._token_manager.verify_token(refresh_token, "refresh")
        if not payload:
            raise AuthenticationException("刷新令牌无效或已过期")

        identity = None
        raw_user_id = payload.get("user_id")
        if raw_user_id is not None:
            try:
                identity = self._repository.find_active_by_id(int(raw_user_id))
            except (TypeError, ValueError):
                identity = None
        if not identity:
            login = payload.get("username") or payload.get("sub")
            if isinstance(login, str):
                identity = self._repository.find_active_by_login(login)
        if not identity:
            raise AuthenticationException("刷新令牌对应用户不存在或已禁用")
        return await self._create_tokens(
            identity, remember_me=bool(payload.get("remember_me", False))
        )

    async def logout(self, token: str) -> None:
        await self._token_manager.blacklist_token(token)

    async def change_password(
        self,
        *,
        principal: AccessPrincipal,
        current_password: str,
        new_password: str,
        confirm_password: str,
    ) -> None:
        if new_password != confirm_password:
            raise BusinessLogicException("新密码和确认密码不匹配")
        identity = self._repository.find_active_by_login(principal["username"])
        if not identity:
            raise AuthenticationException("用户不存在")
        if not await self._password_hasher.verify(
            current_password, identity.password_hash
        ):
            raise AuthenticationException("当前密码错误")
        password_hash = await self._password_hasher.hash(new_password)
        if not self._repository.update_password(identity.id, password_hash):
            raise AuthenticationException("用户不存在")

    async def _create_tokens(
        self, identity: AuthenticatedIdentity, *, remember_me: bool
    ) -> TokenPair:
        token_data: dict[str, Any] = {
            "sub": identity.username,
            "user_id": identity.id,
            "username": identity.username,
            "email": identity.email,
            "roles": list(identity.roles),
            "permissions": list(identity.permissions),
            "is_active": identity.is_active,
            "is_superuser": identity.is_superuser,
            "is_system_admin": identity.is_system_admin,
            "system_admin_level": identity.system_admin_level,
            "remember_me": remember_me,
        }
        access_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        refresh_days = (
            settings.REMEMBER_ME_REFRESH_TOKEN_EXPIRE_DAYS
            if remember_me
            else settings.REFRESH_TOKEN_EXPIRE_DAYS
        )
        refresh_expires = timedelta(days=refresh_days)
        return TokenPair(
            access_token=self._token_manager.create_access_token(
                token_data, access_expires
            ),
            refresh_token=await self._token_manager.create_refresh_token(
                token_data, refresh_expires
            ),
            token_type="bearer",
            expires_in=int(access_expires.total_seconds()),
        )
