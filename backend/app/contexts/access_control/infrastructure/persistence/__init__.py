"""访问控制 SQLAlchemy 持久化公开入口。"""

from .models import Department, Permission, Role, RolePermission, User, UserRole
from .repository import SqlAlchemyIdentityRepository

__all__ = [
    "Department",
    "Permission",
    "Role",
    "RolePermission",
    "SqlAlchemyIdentityRepository",
    "User",
    "UserRole",
]
