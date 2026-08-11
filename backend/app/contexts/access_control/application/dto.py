"""访问控制应用 DTO。"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, NotRequired, TypedDict


class AccessPrincipal(TypedDict):
    id: int | str
    user_id: NotRequired[int | str | None]
    username: str
    email: str | None
    roles: list[str]
    permissions: list[str]
    is_active: bool
    is_superuser: bool
    is_system_admin: bool
    system_admin_level: int
    auth_type: NotRequired[str]
    api_key_name: NotRequired[Any]


@dataclass(frozen=True, slots=True)
class TokenPair:
    access_token: str
    refresh_token: str
    token_type: str
    expires_in: int


@dataclass(frozen=True, slots=True)
class UserProfile:
    id: int
    username: str
    email: str
    full_name: str
    phone: str | None
    real_name: str | None
    employee_id: str | None
    department: str | None
    department_id: int | None
    position: str | None
    title: str | None
    is_active: bool
    is_superuser: bool
    is_system_admin: bool
    system_admin_level: int
    avatar_storage_bucket: str | None
    avatar_object_key: str | None
    avatar_url: str | None
    avatar_deleted: bool
    created_at: str | None
    updated_at: str | None


@dataclass(frozen=True, slots=True)
class AvatarUploadSession:
    storage_bucket: str
    object_key: str
    upload_id: str
    part_size: int
    expires_in: int
    parts: list[dict[str, Any]]
