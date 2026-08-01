"""
用户管理相关模型

包含用户、角色、权限、部门等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
"""

from __future__ import annotations

import datetime as datetime_types
import typing
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, relationship

from .base import Base

if TYPE_CHECKING:
    from .team import TeamMembership


class Department(Base):
    """部门表"""

    __tablename__ = "departments"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="部门ID"
    )
    code: Mapped[typing.Any] = Column(
        String(50), unique=True, nullable=False, comment="部门代码"
    )
    name: Mapped[typing.Any] = Column(String(100), nullable=False, comment="部门名称")
    full_name: Mapped[typing.Any] = Column(String(200), comment="部门全称")
    description: Mapped[str | None] = Column(Text, comment="部门描述")
    parent_id: Mapped[int | None] = Column(
        Integer, ForeignKey("departments.id"), comment="上级部门ID"
    )
    level: Mapped[int | None] = Column(Integer, comment="部门层级")
    path: Mapped[typing.Any] = Column(String(500), comment="部门路径")
    sort_order: Mapped[int | None] = Column(Integer, comment="排序")
    status: Mapped[typing.Any] = Column(String(20), nullable=False, comment="状态")
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")

    # 关系
    parent: Mapped[Department | None] = relationship(
        "Department", remote_side=[id], backref="children"
    )
    users: Mapped[list[User]] = relationship("User", back_populates="department")


class Role(Base):
    """角色表"""

    __tablename__ = "roles"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="角色ID"
    )
    code: Mapped[typing.Any] = Column(
        String(50), unique=True, nullable=False, comment="角色代码"
    )
    name: Mapped[typing.Any] = Column(String(50), nullable=False, comment="角色名称")
    description: Mapped[str | None] = Column(Text, comment="角色描述")
    level: Mapped[int | None] = Column(Integer, comment="角色级别")
    status: Mapped[typing.Any] = Column(String(20), nullable=False, comment="状态")
    is_system: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否系统角色"
    )
    is_default: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否默认角色"
    )
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")

    # 关系
    permissions: Mapped[list[RolePermission]] = relationship(
        "RolePermission", back_populates="role"
    )
    users: Mapped[list[UserRole]] = relationship("UserRole", back_populates="role")


class Permission(Base):
    """权限表"""

    __tablename__ = "permissions"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="权限ID"
    )
    code: Mapped[typing.Any] = Column(
        String(100), unique=True, nullable=False, comment="权限代码"
    )
    name: Mapped[typing.Any] = Column(String(50), nullable=False, comment="权限名称")
    description: Mapped[str | None] = Column(Text, comment="权限描述")
    module: Mapped[typing.Any] = Column(String(50), nullable=False, comment="所属模块")
    resource: Mapped[typing.Any] = Column(String(50), nullable=False, comment="资源")
    action: Mapped[typing.Any] = Column(String(50), nullable=False, comment="操作")
    status: Mapped[typing.Any] = Column(String(20), nullable=False, comment="状态")
    is_system: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否系统权限"
    )
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")

    # 关系
    roles: Mapped[list[RolePermission]] = relationship(
        "RolePermission", back_populates="permission"
    )


class User(Base):
    """用户表"""

    __tablename__ = "users"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="用户ID"
    )
    username: Mapped[typing.Any] = Column(
        String(50), unique=True, nullable=False, comment="用户名"
    )
    email: Mapped[typing.Any] = Column(
        String(100), unique=True, nullable=False, comment="邮箱"
    )
    phone: Mapped[typing.Any] = Column(String(20), unique=True, comment="手机号")
    password_hash: Mapped[typing.Any] = Column(
        String(255), nullable=False, comment="密码哈希"
    )
    salt: Mapped[typing.Any] = Column(String(32), nullable=False, comment="密码盐")
    real_name: Mapped[typing.Any] = Column(
        String(50), nullable=False, comment="真实姓名"
    )
    employee_id: Mapped[typing.Any] = Column(
        String(20), unique=True, comment="员工编号"
    )
    department_id: Mapped[int | None] = Column(
        Integer, ForeignKey("departments.id"), comment="部门ID"
    )
    position: Mapped[typing.Any] = Column(String(50), comment="职位")
    title: Mapped[typing.Any] = Column(String(50), comment="职称")
    status: Mapped[typing.Any] = Column(String(20), nullable=False, comment="状态")
    is_verified: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否验证"
    )
    is_superuser: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否超级管理员"
    )
    is_system_admin: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否系统管理员（可创建团队）"
    )
    system_admin_level: Mapped[int | None] = Column(
        Integer,
        default=0,
        comment="系统管理员级别：0-非系统管理员，1-超级系统管理员（可看所有团队），2-二级系统管理员（只看自己创建的团队）",
    )
    avatar_storage_bucket: Mapped[typing.Any] = Column(
        String(128), comment="头像对象存储桶"
    )
    avatar_object_key: Mapped[typing.Any] = Column(String(500), comment="头像对象Key")
    avatar_storage_etag: Mapped[typing.Any] = Column(
        String(128), comment="头像对象ETag"
    )
    avatar_deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="头像软删除时间"
    )
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")

    # 关系
    department: Mapped[Department | None] = relationship(
        "Department", back_populates="users"
    )
    roles: Mapped[list[UserRole]] = relationship("UserRole", back_populates="user")
    team_memberships: Mapped[list[TeamMembership]] = relationship(
        "TeamMembership",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserRole(Base):
    """用户角色关联表"""

    __tablename__ = "user_roles"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="ID"
    )
    user_id: Mapped[int] = Column(
        Integer, ForeignKey("users.id"), nullable=False, comment="用户ID"
    )
    role_id: Mapped[int] = Column(
        Integer, ForeignKey("roles.id"), nullable=False, comment="角色ID"
    )
    assigned_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="分配时间"
    )
    is_active: Mapped[bool | None] = Column(Boolean, default=True, comment="是否激活")

    # 关系
    user: Mapped[User] = relationship("User", back_populates="roles")
    role: Mapped[Role] = relationship("Role", back_populates="users")


class RolePermission(Base):
    """角色权限关联表"""

    __tablename__ = "role_permissions"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="ID"
    )
    role_id: Mapped[int] = Column(
        Integer, ForeignKey("roles.id"), nullable=False, comment="角色ID"
    )
    permission_id: Mapped[int] = Column(
        Integer, ForeignKey("permissions.id"), nullable=False, comment="权限ID"
    )
    granted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="授权时间"
    )
    is_active: Mapped[bool | None] = Column(Boolean, default=True, comment="是否激活")

    # 关系
    role: Mapped[Role] = relationship("Role", back_populates="permissions")
    permission: Mapped[Permission] = relationship("Permission", back_populates="roles")
