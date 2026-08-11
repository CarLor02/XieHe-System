"""访问控制领域身份模型。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AuthenticatedIdentity:
    id: int
    username: str
    email: str
    full_name: str
    password_hash: str
    is_active: bool
    is_superuser: bool
    is_system_admin: bool
    system_admin_level: int
    roles: tuple[str, ...]
    permissions: tuple[str, ...]

    @property
    def primary_role(self) -> str:
        return "admin" if self.is_superuser else "doctor"
