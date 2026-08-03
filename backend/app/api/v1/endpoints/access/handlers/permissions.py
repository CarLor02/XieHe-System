"""Mock permission-management endpoints that remain outside the team context."""

import random
import typing
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.access.auth import get_current_active_user
from app.core.system.response import paginated_response, success_response
from app.shared.database import get_db

from ..schemas.permissions import (
    Permission,
    PermissionAction,
    PermissionAssignRequest,
    PermissionAuditLog,
    PermissionMatrix,
    PermissionRequest,
    PermissionType,
    ResourceType,
    Role,
    RoleRequest,
    RoleStatus,
    UserGroup,
    UserPermissions,
)

router = APIRouter()


# API端点
@router.get("/permissions", response_model=Dict[str, Any])
async def get_permissions(
    resource_type: Optional[ResourceType] = Query(None, description="资源类型筛选"),
    permission_type: Optional[PermissionType] = Query(None, description="权限类型筛选"),
    is_system: Optional[bool] = Query(None, description="是否系统权限"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页数量"),
) -> typing.Any:
    """获取权限列表"""
    try:
        # 模拟权限数据
        mock_permissions = []
        permission_templates = [
            (
                "报告查看",
                "report:read",
                "查看医疗报告",
                ResourceType.REPORT,
                PermissionType.READ,
            ),
            (
                "报告创建",
                "report:write",
                "创建医疗报告",
                ResourceType.REPORT,
                PermissionType.WRITE,
            ),
            (
                "报告删除",
                "report:delete",
                "删除医疗报告",
                ResourceType.REPORT,
                PermissionType.DELETE,
            ),
            (
                "报告审核",
                "report:execute",
                "审核医疗报告",
                ResourceType.REPORT,
                PermissionType.EXECUTE,
            ),
            (
                "患者查看",
                "patient:read",
                "查看患者信息",
                ResourceType.PATIENT,
                PermissionType.READ,
            ),
            (
                "患者管理",
                "patient:write",
                "管理患者信息",
                ResourceType.PATIENT,
                PermissionType.WRITE,
            ),
            (
                "影像查看",
                "image:read",
                "查看医学影像",
                ResourceType.IMAGE,
                PermissionType.READ,
            ),
            (
                "影像上传",
                "image:write",
                "上传医学影像",
                ResourceType.IMAGE,
                PermissionType.WRITE,
            ),
            (
                "用户管理",
                "user:admin",
                "管理系统用户",
                ResourceType.USER,
                PermissionType.ADMIN,
            ),
            (
                "系统管理",
                "system:admin",
                "系统管理权限",
                ResourceType.SYSTEM,
                PermissionType.ADMIN,
            ),
            (
                "数据分析",
                "analytics:read",
                "查看数据分析",
                ResourceType.ANALYTICS,
                PermissionType.READ,
            ),
        ]

        for i, (name, code, desc, res_type, perm_type) in enumerate(
            permission_templates, 1
        ):
            permission = Permission(
                permission_id=f"PERM_{i:03d}",
                name=name,
                code=code,
                description=desc,
                resource_type=res_type,
                permission_type=perm_type,
                is_system=perm_type == PermissionType.ADMIN,
                created_at=datetime.now() - timedelta(days=random.randint(1, 30)),
                updated_at=datetime.now() - timedelta(days=random.randint(0, 7)),
                created_by="SYSTEM",
                usage_count=random.randint(10, 500),
            )
            mock_permissions.append(permission)

        # 应用筛选
        filtered_permissions = mock_permissions
        if resource_type:
            filtered_permissions = [
                p for p in filtered_permissions if p.resource_type == resource_type
            ]
        if permission_type:
            filtered_permissions = [
                p for p in filtered_permissions if p.permission_type == permission_type
            ]
        if is_system is not None:
            filtered_permissions = [
                p for p in filtered_permissions if p.is_system == is_system
            ]
        if search:
            filtered_permissions = [
                p
                for p in filtered_permissions
                if search.lower() in p.name.lower() or search.lower() in p.code.lower()
            ]

        # 分页
        total = len(filtered_permissions)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = filtered_permissions[start:end]

        return paginated_response(
            items=[p.dict() for p in paginated_items],
            total=total,
            page=page,
            page_size=page_size,
            message="获取权限列表成功",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取权限列表失败: {str(e)}")


@router.post("/permissions", response_model=Dict[str, Any])
async def create_permission(
    permission_request: PermissionRequest,
) -> dict[str, typing.Any]:
    """创建新权限"""
    try:
        # 模拟创建权限
        permission_id = f"PERM_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        new_permission = Permission(
            permission_id=permission_id,
            name=permission_request.name,
            code=permission_request.code,
            description=permission_request.description,
            resource_type=permission_request.resource_type,
            permission_type=permission_request.permission_type,
            is_system=permission_request.is_system,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            created_by="CURRENT_USER",
            usage_count=0,
        )

        return success_response(data=new_permission.dict(), message="权限创建成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建权限失败: {str(e)}")


@router.get("/roles", response_model=Dict[str, Any])
async def get_roles(
    status: Optional[RoleStatus] = Query(None, description="角色状态筛选"),
    is_system: Optional[bool] = Query(None, description="是否系统角色"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页数量"),
) -> typing.Any:
    """获取角色列表"""
    try:
        # 模拟角色数据
        mock_roles = []
        role_templates = [
            ("超级管理员", "super_admin", "系统超级管理员", True, 50),
            ("系统管理员", "system_admin", "系统管理员", True, 35),
            ("医生", "doctor", "医生角色", False, 200),
            ("护士", "nurse", "护士角色", False, 150),
            ("技师", "technician", "技师角色", False, 80),
            ("审核员", "reviewer", "报告审核员", False, 45),
            ("数据分析师", "analyst", "数据分析师", False, 25),
            ("访客", "guest", "访客用户", False, 10),
        ]

        # 获取权限列表用于角色分配
        permissions_response = await get_permissions(page=1, page_size=100)
        permissions_data = permissions_response.get("data", {}).get("items", [])
        permissions = [Permission(**p) for p in permissions_data]

        for i, (name, code, desc, is_sys, user_count) in enumerate(role_templates, 1):
            # 为每个角色分配不同的权限
            max_perms = min(8, len(permissions))
            min_perms = min(3, max_perms)
            role_permissions = (
                random.sample(permissions, random.randint(min_perms, max_perms))
                if permissions
                else []
            )

            role = Role(
                role_id=f"ROLE_{i:03d}",
                name=name,
                code=code,
                description=desc,
                permissions=role_permissions,
                parent_role_id=f"ROLE_{i - 1:03d}" if i > 1 and not is_sys else None,
                parent_role_name=role_templates[i - 2][0]
                if i > 1 and not is_sys
                else None,
                child_roles=[
                    f"ROLE_{j:03d}"
                    for j in range(i + 1, min(i + 3, len(role_templates) + 1))
                ],
                user_count=user_count,
                is_system=is_sys,
                status=RoleStatus.ACTIVE,
                created_at=datetime.now() - timedelta(days=random.randint(1, 60)),
                updated_at=datetime.now() - timedelta(days=random.randint(0, 7)),
                created_by="SYSTEM" if is_sys else "ADMIN",
            )
            mock_roles.append(role)

        # 应用筛选
        filtered_roles = mock_roles
        if status:
            filtered_roles = [r for r in filtered_roles if r.status == status]
        if is_system is not None:
            filtered_roles = [r for r in filtered_roles if r.is_system == is_system]
        if search:
            filtered_roles = [
                r
                for r in filtered_roles
                if search.lower() in r.name.lower() or search.lower() in r.code.lower()
            ]

        # 分页
        total = len(filtered_roles)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = filtered_roles[start:end]

        return paginated_response(
            items=[r.dict() for r in paginated_items],
            total=total,
            page=page,
            page_size=page_size,
            message="获取角色列表成功",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取角色列表失败: {str(e)}")


@router.post("/roles", response_model=Dict[str, Any])
async def create_role(role_request: RoleRequest) -> dict[str, typing.Any]:
    """创建新角色"""
    try:
        # 模拟创建角色
        role_id = f"ROLE_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        # 获取权限详情
        permissions_response = await get_permissions(page=1, page_size=100)
        permissions_data = permissions_response.get("data", {}).get("items", [])
        permissions = [Permission(**p) for p in permissions_data]
        role_permissions = [
            p for p in permissions if p.permission_id in role_request.permissions
        ]

        new_role = Role(
            role_id=role_id,
            name=role_request.name,
            code=role_request.code,
            description=role_request.description,
            permissions=role_permissions,
            parent_role_id=role_request.parent_role_id,
            parent_role_name="父角色名称" if role_request.parent_role_id else None,
            child_roles=[],
            user_count=0,
            is_system=role_request.is_system,
            status=RoleStatus.ACTIVE,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            created_by="CURRENT_USER",
        )

        return success_response(data=new_role.dict(), message="角色创建成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建角色失败: {str(e)}")


@router.get("/user-groups", response_model=Dict[str, Any])
async def get_user_groups(
    search: Optional[str] = Query(None, description="搜索关键词"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页数量"),
) -> typing.Any:
    """获取用户组列表"""
    try:
        # 模拟用户组数据
        mock_groups = []
        group_templates = [
            ("放射科医生组", "放射科医生用户组", 15),
            ("心内科医生组", "心内科医生用户组", 12),
            ("护理部", "护理部用户组", 45),
            ("技师组", "医学技师用户组", 20),
            ("管理员组", "系统管理员用户组", 5),
            ("实习生组", "实习生用户组", 8),
        ]

        # 获取角色列表用于用户组分配
        roles_response = await get_roles(page=1, page_size=20)
        roles_data = roles_response.get("data", {}).get("items", [])
        roles = [Role(**r) for r in roles_data]

        for i, (name, desc, user_count) in enumerate(group_templates, 1):
            # 为每个用户组分配角色
            max_roles = min(3, len(roles))
            min_roles = min(1, max_roles)
            group_roles = (
                random.sample(roles, random.randint(min_roles, max_roles))
                if roles
                else []
            )

            # 模拟用户列表
            users = []
            for j in range(user_count):
                users.append(
                    {
                        "user_id": f"USER_{i:03d}_{j:03d}",
                        "username": f"user{i}_{j}",
                        "name": f"用户{i}_{j}",
                        "email": f"user{i}_{j}@hospital.com",
                        "status": "active",
                    }
                )

            group = UserGroup(
                group_id=f"GROUP_{i:03d}",
                name=name,
                description=desc,
                roles=group_roles,
                users=users,
                user_count=user_count,
                created_at=datetime.now() - timedelta(days=random.randint(1, 90)),
                updated_at=datetime.now() - timedelta(days=random.randint(0, 7)),
                created_by="ADMIN",
            )
            mock_groups.append(group)

        # 应用筛选
        if search:
            mock_groups = [g for g in mock_groups if search.lower() in g.name.lower()]

        # 分页
        total = len(mock_groups)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = mock_groups[start:end]

        return paginated_response(
            items=[g.dict() for g in paginated_items],
            total=total,
            page=page,
            page_size=page_size,
            message="获取用户组列表成功",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户组列表失败: {str(e)}")


@router.get("/users/{user_id}/permissions", response_model=Dict[str, Any])
async def get_user_permissions(user_id: str) -> dict[str, typing.Any]:
    """获取用户权限详情"""
    try:
        # 获取基础数据
        permissions_response = await get_permissions(page=1, page_size=100)
        permissions_data = permissions_response.get("data", {}).get("items", [])
        permissions = [Permission(**p) for p in permissions_data]

        roles_response = await get_roles(page=1, page_size=20)
        roles_data = roles_response.get("data", {}).get("items", [])
        roles = [Role(**r) for r in roles_data]

        groups_response = await get_user_groups(search=None, page=1, page_size=10)
        groups_data = groups_response.get("data", {}).get("items", [])
        groups = [UserGroup(**g) for g in groups_data]

        # 模拟用户权限
        max_perms = min(5, len(permissions))
        min_perms = min(2, max_perms)
        direct_permissions = (
            random.sample(permissions, random.randint(min_perms, max_perms))
            if permissions
            else []
        )

        max_roles = min(3, len(roles))
        min_roles = min(1, max_roles)
        user_roles = (
            random.sample(roles, random.randint(min_roles, max_roles)) if roles else []
        )

        max_groups = min(2, len(groups))
        user_groups = (
            random.sample(groups, random.randint(0, max_groups)) if groups else []
        )

        # 计算角色权限
        role_permissions = []
        for role in user_roles:
            role_permissions.extend(role.permissions)

        # 计算用户组权限
        group_permissions = []
        for group in user_groups:
            for role in group.roles:
                group_permissions.extend(role.permissions)

        # 计算有效权限（去重）
        all_permissions = direct_permissions + role_permissions + group_permissions
        effective_permissions = []
        seen_ids = set()
        for perm in all_permissions:
            if perm.permission_id not in seen_ids:
                effective_permissions.append(perm)
                seen_ids.add(perm.permission_id)

        user_permissions = UserPermissions(
            user_id=user_id,
            username=f"user_{user_id}",
            direct_permissions=direct_permissions,
            role_permissions=role_permissions,
            group_permissions=group_permissions,
            effective_permissions=effective_permissions,
            roles=user_roles,
            groups=user_groups,
            last_updated=datetime.now(),
        )

        return success_response(
            data=user_permissions.dict(), message="获取用户权限成功"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户权限失败: {str(e)}")


@router.post("/assign-permissions", response_model=Dict[str, Any])
async def assign_permissions(
    assign_request: PermissionAssignRequest,
) -> dict[str, typing.Any]:
    """分配权限"""
    try:
        # 模拟权限分配
        target_type = (
            "user"
            if assign_request.user_id
            else ("role" if assign_request.role_id else "group")
        )
        target_id = (
            assign_request.user_id or assign_request.role_id or assign_request.group_id
        )

        # 创建审计日志
        audit_log = PermissionAuditLog(
            log_id=f"AUDIT_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            action=assign_request.action,
            target_type=target_type,
            target_id=target_id,
            target_name=f"{target_type}_{target_id}",
            permissions=assign_request.permissions,
            permission_names=[f"权限_{pid}" for pid in assign_request.permissions],
            operator_id="CURRENT_USER",
            operator_name="当前用户",
            reason=assign_request.reason,
            ip_address="192.168.1.100",
            user_agent="Mozilla/5.0...",
            created_at=datetime.now(),
        )

        return success_response(
            data={
                "target_type": target_type,
                "target_id": target_id,
                "permissions_count": len(assign_request.permissions),
                "audit_log": audit_log.dict(),
            },
            message=f"权限{assign_request.action.value}成功",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"分配权限失败: {str(e)}")


@router.get("/audit-logs", response_model=Dict[str, Any])
async def get_permission_audit_logs(
    target_type: Optional[str] = Query(None, description="目标类型筛选"),
    action: Optional[PermissionAction] = Query(None, description="操作类型筛选"),
    start_date: Optional[str] = Query(None, description="开始日期"),
    end_date: Optional[str] = Query(None, description="结束日期"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=200, description="每页数量"),
) -> typing.Any:
    """获取权限审计日志"""
    try:
        # 模拟审计日志数据
        mock_logs = []
        for i in range(1, 101):
            log = PermissionAuditLog(
                log_id=f"AUDIT_{i:03d}",
                action=random.choice(list(PermissionAction)),
                target_type=random.choice(["user", "role", "group"]),
                target_id=f"TARGET_{i:03d}",
                target_name=f"目标_{i}",
                permissions=[f"PERM_{j:03d}" for j in range(1, random.randint(2, 6))],
                permission_names=[f"权限_{j}" for j in range(1, random.randint(2, 6))],
                operator_id=f"USER_{random.randint(1, 10):03d}",
                operator_name=random.choice(["张管理员", "李管理员", "王管理员"]),
                reason=random.choice(
                    ["角色调整", "权限更新", "用户离职", "部门调整", None]
                ),
                ip_address=f"192.168.1.{random.randint(1, 254)}",
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                created_at=datetime.now() - timedelta(days=random.randint(0, 30)),
            )
            mock_logs.append(log)

        # 应用筛选
        filtered_logs = mock_logs
        if target_type:
            filtered_logs = [
                log for log in filtered_logs if log.target_type == target_type
            ]
        if action:
            filtered_logs = [log for log in filtered_logs if log.action == action]

        # 按时间排序
        filtered_logs.sort(key=lambda x: x.created_at, reverse=True)

        # 分页
        total = len(filtered_logs)
        start = (page - 1) * page_size
        end = start + page_size
        paginated_items = filtered_logs[start:end]

        return paginated_response(
            items=[log.dict() for log in paginated_items],
            total=total,
            page=page,
            page_size=page_size,
            message="获取审计日志成功",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取审计日志失败: {str(e)}")


@router.get("/permission-matrix", response_model=Dict[str, Any])
async def get_permission_matrix() -> dict[str, typing.Any]:
    """获取权限矩阵"""
    try:
        # 获取基础数据
        permissions_response = await get_permissions(page=1, page_size=50)
        permissions_data = permissions_response.get("data", {}).get("items", [])
        permissions = [Permission(**p) for p in permissions_data]

        roles_response = await get_roles(page=1, page_size=20)
        roles_data = roles_response.get("data", {}).get("items", [])
        roles = [Role(**r) for r in roles_data]

        # 构建权限矩阵
        resources = list(set([p.resource_type.value for p in permissions]))
        permission_types = list(set([p.permission_type.value for p in permissions]))
        role_names = [r.name for r in roles]

        # 模拟权限矩阵数据
        matrix: dict[str, dict[str, dict[str, bool]]] = {}
        for role in roles:
            matrix[role.name] = {}
            for resource in resources:
                matrix[role.name][resource] = {}
                for perm_type in permission_types:
                    # 模拟权限分配
                    matrix[role.name][resource][perm_type] = random.choice(
                        [True, False]
                    )

        permission_matrix = PermissionMatrix(
            resources=resources,
            permissions=permission_types,
            roles=role_names,
            matrix=matrix,
        )

        return success_response(
            data=permission_matrix.dict(), message="获取权限矩阵成功"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取权限矩阵失败: {str(e)}")


@router.get("/users", response_model=Dict[str, Any])
async def get_users(
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db),
) -> dict[str, typing.Any]:
    """获取用户列表"""
    try:
        # 使用原生SQL查询用户数据
        from sqlalchemy import text

        query = """
        SELECT
            u.id,
            u.username,
            u.email,
            u.full_name,
            u.is_active,
            u.created_at,
            u.updated_at
        FROM users u
        WHERE (u.is_deleted = 0 OR u.is_deleted IS NULL)
        ORDER BY u.created_at DESC
        """

        result = db.execute(text(query))
        rows = result.fetchall()

        users = []
        for row in rows:
            user_data = {
                "id": row[0],
                "username": row[1],
                "email": row[2] or "",
                "full_name": row[3] or "",
                "is_active": bool(row[4]),
                "created_at": row[5].isoformat() if row[5] else "",
                "updated_at": row[6].isoformat() if row[6] else "",
            }
            users.append(user_data)

        return success_response(data={"users": users}, message="获取用户列表成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取用户列表失败: {str(e)}")
