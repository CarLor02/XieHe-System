"""Schemas for the permissions API endpoints."""

from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field

class PermissionType(str, Enum):
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"


class ResourceType(str, Enum):
    REPORT = "report"
    PATIENT = "patient"
    IMAGE = "image"
    USER = "user"
    SYSTEM = "system"
    ANALYTICS = "analytics"


class RoleStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DEPRECATED = "deprecated"


class PermissionAction(str, Enum):
    GRANT = "grant"
    REVOKE = "revoke"
    MODIFY = "modify"


class PermissionRequest(BaseModel):
    name: str = Field(..., description="权限名称")
    code: str = Field(..., description="权限代码")
    description: Optional[str] = Field(None, description="权限描述")
    resource_type: ResourceType = Field(..., description="资源类型")
    permission_type: PermissionType = Field(..., description="权限类型")
    is_system: bool = Field(False, description="是否为系统权限")


class RoleRequest(BaseModel):
    name: str = Field(..., description="角色名称")
    code: str = Field(..., description="角色代码")
    description: Optional[str] = Field(None, description="角色描述")
    permissions: List[str] = Field([], description="权限ID列表")
    parent_role_id: Optional[str] = Field(None, description="父角色ID")
    is_system: bool = Field(False, description="是否为系统角色")


class UserGroupRequest(BaseModel):
    name: str = Field(..., description="用户组名称")
    description: Optional[str] = Field(None, description="用户组描述")
    roles: List[str] = Field([], description="角色ID列表")
    users: List[str] = Field([], description="用户ID列表")


class PermissionAssignRequest(BaseModel):
    user_id: Optional[str] = Field(None, description="用户ID")
    role_id: Optional[str] = Field(None, description="角色ID")
    group_id: Optional[str] = Field(None, description="用户组ID")
    permissions: List[str] = Field(..., description="权限ID列表")
    action: PermissionAction = Field(..., description="操作类型")
    reason: Optional[str] = Field(None, description="操作原因")


class Permission(BaseModel):
    permission_id: str
    name: str
    code: str
    description: Optional[str]
    resource_type: ResourceType
    permission_type: PermissionType
    is_system: bool
    created_at: datetime
    updated_at: datetime
    created_by: str
    usage_count: int


class Role(BaseModel):
    role_id: str
    name: str
    code: str
    description: Optional[str]
    permissions: List[Permission]
    parent_role_id: Optional[str]
    parent_role_name: Optional[str]
    child_roles: List[str]
    user_count: int
    is_system: bool
    status: RoleStatus
    created_at: datetime
    updated_at: datetime
    created_by: str


class UserGroup(BaseModel):
    group_id: str
    name: str
    description: Optional[str]
    roles: List[Role]
    users: List[Dict[str, Any]]
    user_count: int
    created_at: datetime
    updated_at: datetime
    created_by: str


class UserPermissions(BaseModel):
    user_id: str
    username: str
    direct_permissions: List[Permission]
    role_permissions: List[Permission]
    group_permissions: List[Permission]
    effective_permissions: List[Permission]
    roles: List[Role]
    groups: List[UserGroup]
    last_updated: datetime


class PermissionAuditLog(BaseModel):
    log_id: str
    action: PermissionAction
    target_type: str  # user, role, group
    target_id: str
    target_name: str
    permissions: List[str]
    permission_names: List[str]
    operator_id: str
    operator_name: str
    reason: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime


class PermissionMatrix(BaseModel):
    resources: List[str]
    permissions: List[str]
    roles: List[str]
    matrix: Dict[str, Dict[str, Dict[str, bool]]]  # role -> resource -> permission -> allowed


class MemberRoleUpdateRequest(BaseModel):
    """更新成员角色请求"""
    role: str = Field(..., description="新角色（ADMIN/MEMBER/GUEST）")
