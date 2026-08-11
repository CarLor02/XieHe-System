"""通用权限管理兼容 HTTP 接口；不参与实际访问判定。"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.infrastructure.demo_permissions import (
    demo_permission_provider,
)
from app.contexts.access_control.infrastructure.persistence import (
    SqlAlchemyIdentityRepository,
)
from app.core.system.response import paginated_response, success_response

from ..dependencies import get_current_active_user, get_identity_repository
from ..schemas.permissions import (
    PermissionAction,
    PermissionAssignRequest,
    PermissionRequest,
    PermissionType,
    ResourceType,
    RoleRequest,
    RoleStatus,
)

router = APIRouter()


def _page(
    items: list[dict[str, Any]], page: int, page_size: int
) -> list[dict[str, Any]]:
    start = (page - 1) * page_size
    return items[start : start + page_size]


@router.get("/permissions", response_model=dict[str, Any])
async def get_permissions(
    resource_type: ResourceType | None = Query(None),
    permission_type: PermissionType | None = Query(None),
    is_system: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    items = demo_permission_provider.permissions(
        resource_type=resource_type.value if resource_type else None,
        permission_type=permission_type.value if permission_type else None,
        is_system=is_system,
        search=search,
    )
    return paginated_response(
        items=_page(items, page, page_size),
        total=len(items),
        page=page,
        page_size=page_size,
        message="获取权限列表成功",
    )


@router.post("/permissions", response_model=dict[str, Any])
async def create_permission(request: PermissionRequest) -> dict[str, Any]:
    return success_response(
        data=demo_permission_provider.create_permission(request.model_dump()),
        message="权限创建成功",
    )


@router.get("/roles", response_model=dict[str, Any])
async def get_roles(
    status: RoleStatus | None = Query(None),
    is_system: bool | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    items = demo_permission_provider.roles(
        status=status.value if status else None,
        is_system=is_system,
        search=search,
    )
    return paginated_response(
        items=_page(items, page, page_size),
        total=len(items),
        page=page,
        page_size=page_size,
        message="获取角色列表成功",
    )


@router.post("/roles", response_model=dict[str, Any])
async def create_role(request: RoleRequest) -> dict[str, Any]:
    return success_response(
        data=demo_permission_provider.create_role(request.model_dump()),
        message="角色创建成功",
    )


@router.get("/user-groups", response_model=dict[str, Any])
async def get_user_groups(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    items = demo_permission_provider.groups(search=search)
    return paginated_response(
        items=_page(items, page, page_size),
        total=len(items),
        page=page,
        page_size=page_size,
        message="获取用户组列表成功",
    )


@router.get("/users/{user_id}/permissions", response_model=dict[str, Any])
async def get_user_permissions(user_id: str) -> dict[str, Any]:
    return success_response(
        data=demo_permission_provider.user_permissions(user_id),
        message="获取用户权限成功",
    )


@router.post("/assign-permissions", response_model=dict[str, Any])
async def assign_permissions(request: PermissionAssignRequest) -> dict[str, Any]:
    values = request.model_dump()
    values["action"] = request.action.value
    return success_response(
        data=demo_permission_provider.assign_permissions(values),
        message=f"权限{request.action.value}成功",
    )


@router.get("/audit-logs", response_model=dict[str, Any])
async def get_permission_audit_logs(
    target_type: str | None = Query(None),
    action: PermissionAction | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict[str, Any]:
    del start_date, end_date
    items = demo_permission_provider.audit_logs(
        target_type=target_type, action=action.value if action else None
    )
    return paginated_response(
        items=_page(items, page, page_size),
        total=len(items),
        page=page,
        page_size=page_size,
        message="获取审计日志成功",
    )


@router.get("/permission-matrix", response_model=dict[str, Any])
async def get_permission_matrix() -> dict[str, Any]:
    return success_response(
        data=demo_permission_provider.permission_matrix(),
        message="获取权限矩阵成功",
    )


@router.get("/users", response_model=dict[str, Any])
async def get_users(
    principal: AccessPrincipal = Depends(get_current_active_user),
    repository: SqlAlchemyIdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    del principal
    return success_response(
        data={"users": repository.list_users()}, message="获取用户列表成功"
    )
