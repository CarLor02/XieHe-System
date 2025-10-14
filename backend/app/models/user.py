"""
用户管理相关模型

包含用户、角色、权限、部门等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
"""

from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from .base import Base


class Department(Base):
    """部门表"""
    __tablename__ = "departments"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="部门ID")
    code = Column(String(50), unique=True, nullable=False, comment="部门代码")
    name = Column(String(100), nullable=False, comment="部门名称")
    full_name = Column(String(200), comment="部门全称")
    description = Column(Text, comment="部门描述")
    parent_id = Column(Integer, ForeignKey('departments.id'), comment="上级部门ID")
    level = Column(Integer, comment="部门层级")
    path = Column(String(500), comment="部门路径")
    sort_order = Column(Integer, comment="排序")
    status = Column(String(20), nullable=False, comment="状态")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    
    # 关系
    parent = relationship("Department", remote_side=[id], backref="children")
    users = relationship("User", back_populates="department")


class Role(Base):
    """角色表"""
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="角色ID")
    code = Column(String(50), unique=True, nullable=False, comment="角色代码")
    name = Column(String(50), nullable=False, comment="角色名称")
    description = Column(Text, comment="角色描述")
    level = Column(Integer, comment="角色级别")
    status = Column(String(20), nullable=False, comment="状态")
    is_system = Column(Boolean, default=False, comment="是否系统角色")
    is_default = Column(Boolean, default=False, comment="是否默认角色")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    
    # 关系
    permissions = relationship("RolePermission", back_populates="role")
    users = relationship("UserRole", back_populates="role")


class Permission(Base):
    """权限表"""
    __tablename__ = "permissions"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="权限ID")
    code = Column(String(100), unique=True, nullable=False, comment="权限代码")
    name = Column(String(50), nullable=False, comment="权限名称")
    description = Column(Text, comment="权限描述")
    module = Column(String(50), nullable=False, comment="所属模块")
    resource = Column(String(50), nullable=False, comment="资源")
    action = Column(String(50), nullable=False, comment="操作")
    status = Column(String(20), nullable=False, comment="状态")
    is_system = Column(Boolean, default=False, comment="是否系统权限")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    
    # 关系
    roles = relationship("RolePermission", back_populates="permission")


class User(Base):
    """用户表"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="用户ID")
    username = Column(String(50), unique=True, nullable=False, comment="用户名")
    email = Column(String(100), unique=True, nullable=False, comment="邮箱")
    phone = Column(String(20), unique=True, comment="手机号")
    password_hash = Column(String(255), nullable=False, comment="密码哈希")
    salt = Column(String(32), nullable=False, comment="密码盐")
    real_name = Column(String(50), nullable=False, comment="真实姓名")
    employee_id = Column(String(20), unique=True, comment="员工编号")
    department_id = Column(Integer, ForeignKey('departments.id'), comment="部门ID")
    position = Column(String(50), comment="职位")
    title = Column(String(50), comment="职称")
    status = Column(String(20), nullable=False, comment="状态")
    is_verified = Column(Boolean, default=False, comment="是否验证")
    is_superuser = Column(Boolean, default=False, comment="是否超级管理员")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    
    # 关系
    department = relationship("Department", back_populates="users")
    roles = relationship("UserRole", back_populates="user")


class UserRole(Base):
    """用户角色关联表"""
    __tablename__ = "user_roles"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="ID")
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False, comment="用户ID")
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False, comment="角色ID")
    assigned_at = Column(DateTime, default=func.now(), comment="分配时间")
    is_active = Column(Boolean, default=True, comment="是否激活")
    
    # 关系
    user = relationship("User", back_populates="roles")
    role = relationship("Role", back_populates="users")


class RolePermission(Base):
    """角色权限关联表"""
    __tablename__ = "role_permissions"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="ID")
    role_id = Column(Integer, ForeignKey('roles.id'), nullable=False, comment="角色ID")
    permission_id = Column(Integer, ForeignKey('permissions.id'), nullable=False, comment="权限ID")
    granted_at = Column(DateTime, default=func.now(), comment="授权时间")
    is_active = Column(Boolean, default=True, comment="是否激活")
    
    # 关系
    role = relationship("Role", back_populates="permissions")
    permission = relationship("Permission", back_populates="roles")

