"""用户身份持久化端口。"""

from __future__ import annotations

from typing import Any, Protocol

from app.contexts.access_control.application.dto import UserProfile
from app.contexts.access_control.domain import AuthenticatedIdentity


class IdentityRepository(Protocol):
    def find_active_by_login(self, login: str) -> AuthenticatedIdentity | None: ...

    def find_active_by_id(self, user_id: int) -> AuthenticatedIdentity | None: ...

    def create_user(
        self,
        *,
        username: str,
        email: str,
        phone: str | None,
        full_name: str,
        password_hash: str,
    ) -> AuthenticatedIdentity: ...

    def update_password(self, user_id: int, password_hash: str) -> bool: ...

    def get_profile(self, user_id: int) -> UserProfile | None: ...

    def update_profile(
        self, user_id: int, changes: dict[str, Any]
    ) -> UserProfile | None: ...

    def phone_in_use(self, phone: str, *, excluding_user_id: int) -> bool: ...

    def save_avatar(
        self, user_id: int, *, bucket: str, object_key: str, etag: str | None
    ) -> UserProfile | None: ...

    def mark_avatar_deleted(self, user_id: int) -> UserProfile | None: ...

    def list_users(self) -> list[dict[str, Any]]: ...
