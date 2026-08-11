"""访问控制 HTTP v1 依赖装配。"""

from __future__ import annotations

from typing import Any

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.contexts.access_control.application import (
    AccessPrincipal,
    AuthenticationService,
    ProfileService,
)
from app.contexts.access_control.infrastructure import (
    BcryptPasswordHasher,
    SqlAlchemyIdentityRepository,
    StorageServiceAvatarStorage,
    security_manager,
)
from app.core.system.exceptions import AuthenticationException, AuthorizationException
from app.shared.database import get_db

security = HTTPBearer(auto_error=False)


def get_identity_repository(
    db: Session = Depends(get_db),
) -> SqlAlchemyIdentityRepository:
    return SqlAlchemyIdentityRepository(db)


def get_authentication_service(
    repository: SqlAlchemyIdentityRepository = Depends(get_identity_repository),
) -> AuthenticationService:
    return AuthenticationService(
        repository,
        BcryptPasswordHasher(security_manager),
        security_manager,
    )


def get_profile_service(
    repository: SqlAlchemyIdentityRepository = Depends(get_identity_repository),
) -> ProfileService:
    return ProfileService(repository, StorageServiceAvatarStorage())


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> AccessPrincipal | None:
    if credentials:
        payload = await security_manager.verify_token(credentials.credentials, "access")
        if payload:
            raw_id = payload.get("user_id") or payload.get("sub")
            if raw_id is not None:
                return {
                    "id": raw_id,
                    "user_id": payload.get("user_id"),
                    "username": str(payload.get("username") or payload.get("sub")),
                    "email": payload.get("email"),
                    "roles": list(payload.get("roles", [])),
                    "permissions": list(payload.get("permissions", [])),
                    "is_active": bool(payload.get("is_active", True)),
                    "is_superuser": bool(payload.get("is_superuser", False)),
                    "is_system_admin": bool(payload.get("is_system_admin", False)),
                    "system_admin_level": int(
                        payload.get("system_admin_level", 0) or 0
                    ),
                }

    api_key = request.headers.get("X-API-Key")
    if not api_key:
        return None
    api_info = await security_manager.verify_api_key(api_key)
    if not api_info or not api_info.get("user_id"):
        return None
    raw_id = api_info["user_id"]
    return {
        "id": raw_id,
        "user_id": raw_id,
        "username": f"api_user_{raw_id}",
        "email": None,
        "roles": ["api_user"],
        "permissions": ["api_access"],
        "is_active": True,
        "is_superuser": False,
        "is_system_admin": False,
        "system_admin_level": 0,
        "auth_type": "api_key",
        "api_key_name": api_info.get("name"),
    }


async def get_current_active_user(
    principal: AccessPrincipal | None = Depends(get_current_user),
) -> AccessPrincipal:
    if not principal:
        raise AuthenticationException("未提供有效的认证凭据")
    if not principal.get("is_active", False):
        raise AuthenticationException("用户账户已被禁用")
    return principal


async def get_current_superuser(
    principal: AccessPrincipal = Depends(get_current_active_user),
) -> AccessPrincipal:
    if not principal.get("is_superuser", False):
        raise AuthorizationException("需要超级用户权限")
    return principal


def principal_roles(principal: AccessPrincipal) -> list[Any]:
    """兼容历史响应中未约束元素类型的角色列表。"""

    return list(principal.get("roles", []))
