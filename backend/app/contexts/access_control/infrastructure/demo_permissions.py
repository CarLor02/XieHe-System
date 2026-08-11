"""未接入实际鉴权链的临时权限展示数据提供器。"""

from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any


class DemoPermissionProvider:
    _permission_templates = [
        ("报告查看", "report:read", "查看医疗报告", "report", "read"),
        ("报告创建", "report:write", "创建医疗报告", "report", "write"),
        ("报告删除", "report:delete", "删除医疗报告", "report", "delete"),
        ("报告审核", "report:execute", "审核医疗报告", "report", "execute"),
        ("患者查看", "patient:read", "查看患者信息", "patient", "read"),
        ("患者管理", "patient:write", "管理患者信息", "patient", "write"),
        ("影像查看", "image:read", "查看医学影像", "image", "read"),
        ("影像上传", "image:write", "上传医学影像", "image", "write"),
        ("用户管理", "user:admin", "管理系统用户", "user", "admin"),
        ("系统管理", "system:admin", "系统管理权限", "system", "admin"),
        ("数据分析", "analytics:read", "查看数据分析", "analytics", "read"),
    ]
    _role_templates = [
        ("超级管理员", "super_admin", "系统超级管理员", True, 50),
        ("系统管理员", "system_admin", "系统管理员", True, 35),
        ("医生", "doctor", "医生角色", False, 200),
        ("护士", "nurse", "护士角色", False, 150),
        ("技师", "technician", "技师角色", False, 80),
        ("审核员", "reviewer", "报告审核员", False, 45),
        ("数据分析师", "analyst", "数据分析师", False, 25),
        ("访客", "guest", "访客用户", False, 10),
    ]
    _group_templates = [
        ("放射科医生组", "放射科医生用户组", 15),
        ("心内科医生组", "心内科医生用户组", 12),
        ("护理部", "护理部用户组", 45),
        ("技师组", "医学技师用户组", 20),
        ("管理员组", "系统管理员用户组", 5),
        ("实习生组", "实习生用户组", 8),
    ]

    def permissions(
        self,
        *,
        resource_type: str | None = None,
        permission_type: str | None = None,
        is_system: bool | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        items = [
            {
                "permission_id": f"PERM_{index:03d}",
                "name": name,
                "code": code,
                "description": description,
                "resource_type": resource,
                "permission_type": action,
                "is_system": action == "admin",
                "created_at": datetime.now() - timedelta(days=random.randint(1, 30)),
                "updated_at": datetime.now() - timedelta(days=random.randint(0, 7)),
                "created_by": "SYSTEM",
                "usage_count": random.randint(10, 500),
            }
            for index, (name, code, description, resource, action) in enumerate(
                self._permission_templates, 1
            )
        ]
        if resource_type:
            items = [item for item in items if item["resource_type"] == resource_type]
        if permission_type:
            items = [
                item for item in items if item["permission_type"] == permission_type
            ]
        if is_system is not None:
            items = [item for item in items if item["is_system"] == is_system]
        if search:
            lowered = search.lower()
            items = [
                item
                for item in items
                if lowered in str(item["name"]).lower()
                or lowered in str(item["code"]).lower()
            ]
        return items

    def create_permission(self, values: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now()
        return {
            "permission_id": f"PERM_{now.strftime('%Y%m%d_%H%M%S')}",
            **values,
            "created_at": now,
            "updated_at": now,
            "created_by": "CURRENT_USER",
            "usage_count": 0,
        }

    def roles(
        self,
        *,
        status: str | None = None,
        is_system: bool | None = None,
        search: str | None = None,
    ) -> list[dict[str, Any]]:
        permissions = self.permissions()
        items: list[dict[str, Any]] = []
        for index, (name, code, description, system, user_count) in enumerate(
            self._role_templates, 1
        ):
            max_permissions = min(8, len(permissions))
            role_permissions = random.sample(
                permissions, random.randint(min(3, max_permissions), max_permissions)
            )
            items.append(
                {
                    "role_id": f"ROLE_{index:03d}",
                    "name": name,
                    "code": code,
                    "description": description,
                    "permissions": role_permissions,
                    "parent_role_id": (
                        f"ROLE_{index - 1:03d}" if index > 1 and not system else None
                    ),
                    "parent_role_name": (
                        self._role_templates[index - 2][0]
                        if index > 1 and not system
                        else None
                    ),
                    "child_roles": [
                        f"ROLE_{child:03d}"
                        for child in range(
                            index + 1, min(index + 3, len(self._role_templates) + 1)
                        )
                    ],
                    "user_count": user_count,
                    "is_system": system,
                    "status": "active",
                    "created_at": datetime.now()
                    - timedelta(days=random.randint(1, 60)),
                    "updated_at": datetime.now() - timedelta(days=random.randint(0, 7)),
                    "created_by": "SYSTEM" if system else "ADMIN",
                }
            )
        if status:
            items = [item for item in items if item["status"] == status]
        if is_system is not None:
            items = [item for item in items if item["is_system"] == is_system]
        if search:
            lowered = search.lower()
            items = [
                item
                for item in items
                if lowered in str(item["name"]).lower()
                or lowered in str(item["code"]).lower()
            ]
        return items

    def create_role(self, values: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now()
        permission_ids = set(values.pop("permissions", []))
        parent_role_id = values.pop("parent_role_id", None)
        permissions = [
            item
            for item in self.permissions()
            if item["permission_id"] in permission_ids
        ]
        return {
            "role_id": f"ROLE_{now.strftime('%Y%m%d_%H%M%S')}",
            **values,
            "permissions": permissions,
            "parent_role_id": parent_role_id,
            "parent_role_name": "父角色名称" if parent_role_id else None,
            "child_roles": [],
            "user_count": 0,
            "status": "active",
            "created_at": now,
            "updated_at": now,
            "created_by": "CURRENT_USER",
        }

    def groups(self, *, search: str | None = None) -> list[dict[str, Any]]:
        roles = self.roles()
        groups: list[dict[str, Any]] = []
        for index, (name, description, user_count) in enumerate(
            self._group_templates, 1
        ):
            group_roles = random.sample(roles, random.randint(1, min(3, len(roles))))
            users = [
                {
                    "user_id": f"USER_{index:03d}_{item:03d}",
                    "username": f"user{index}_{item}",
                    "name": f"用户{index}_{item}",
                    "email": f"user{index}_{item}@hospital.com",
                    "status": "active",
                }
                for item in range(user_count)
            ]
            groups.append(
                {
                    "group_id": f"GROUP_{index:03d}",
                    "name": name,
                    "description": description,
                    "roles": group_roles,
                    "users": users,
                    "user_count": user_count,
                    "created_at": datetime.now()
                    - timedelta(days=random.randint(1, 90)),
                    "updated_at": datetime.now() - timedelta(days=random.randint(0, 7)),
                    "created_by": "ADMIN",
                }
            )
        if search:
            lowered = search.lower()
            groups = [item for item in groups if lowered in str(item["name"]).lower()]
        return groups

    def user_permissions(self, user_id: str) -> dict[str, Any]:
        permissions = self.permissions()
        roles = self.roles()
        groups = self.groups()
        direct = random.sample(permissions, random.randint(2, min(5, len(permissions))))
        user_roles = random.sample(roles, random.randint(1, min(3, len(roles))))
        user_groups = random.sample(groups, random.randint(0, min(2, len(groups))))
        role_permissions = [
            permission for role in user_roles for permission in role["permissions"]
        ]
        group_permissions = [
            permission
            for group in user_groups
            for role in group["roles"]
            for permission in role["permissions"]
        ]
        effective: list[dict[str, Any]] = []
        seen: set[str] = set()
        for permission in direct + role_permissions + group_permissions:
            permission_id = str(permission["permission_id"])
            if permission_id not in seen:
                effective.append(permission)
                seen.add(permission_id)
        return {
            "user_id": user_id,
            "username": f"user_{user_id}",
            "direct_permissions": direct,
            "role_permissions": role_permissions,
            "group_permissions": group_permissions,
            "effective_permissions": effective,
            "roles": user_roles,
            "groups": user_groups,
            "last_updated": datetime.now(),
        }

    def assign_permissions(self, values: dict[str, Any]) -> dict[str, Any]:
        target_type = (
            "user"
            if values.get("user_id")
            else "role"
            if values.get("role_id")
            else "group"
        )
        target_id = (
            values.get("user_id") or values.get("role_id") or values.get("group_id")
        )
        permission_ids = values["permissions"]
        action = values["action"]
        now = datetime.now()
        return {
            "target_type": target_type,
            "target_id": target_id,
            "permissions_count": len(permission_ids),
            "audit_log": {
                "log_id": f"AUDIT_{now.strftime('%Y%m%d_%H%M%S')}",
                "action": action,
                "target_type": target_type,
                "target_id": target_id,
                "target_name": f"{target_type}_{target_id}",
                "permissions": permission_ids,
                "permission_names": [f"权限_{item}" for item in permission_ids],
                "operator_id": "CURRENT_USER",
                "operator_name": "当前用户",
                "reason": values.get("reason"),
                "ip_address": "192.168.1.100",
                "user_agent": "Mozilla/5.0...",
                "created_at": now,
            },
        }

    def audit_logs(
        self, *, target_type: str | None = None, action: str | None = None
    ) -> list[dict[str, Any]]:
        logs = [
            {
                "log_id": f"AUDIT_{index:03d}",
                "action": random.choice(["grant", "revoke", "modify"]),
                "target_type": random.choice(["user", "role", "group"]),
                "target_id": f"TARGET_{index:03d}",
                "target_name": f"目标_{index}",
                "permissions": [
                    f"PERM_{item:03d}" for item in range(1, random.randint(2, 6))
                ],
                "permission_names": [
                    f"权限_{item}" for item in range(1, random.randint(2, 6))
                ],
                "operator_id": f"USER_{random.randint(1, 10):03d}",
                "operator_name": random.choice(["张管理员", "李管理员", "王管理员"]),
                "reason": random.choice(
                    ["角色调整", "权限更新", "用户离职", "部门调整", None]
                ),
                "ip_address": f"192.168.1.{random.randint(1, 254)}",
                "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "created_at": datetime.now() - timedelta(days=random.randint(0, 30)),
            }
            for index in range(1, 101)
        ]
        if target_type:
            logs = [item for item in logs if item["target_type"] == target_type]
        if action:
            logs = [item for item in logs if item["action"] == action]
        return sorted(logs, key=lambda item: item["created_at"], reverse=True)

    def permission_matrix(self) -> dict[str, Any]:
        permissions = self.permissions()
        roles = self.roles()
        resources = list({str(item["resource_type"]) for item in permissions})
        actions = list({str(item["permission_type"]) for item in permissions})
        role_names = [str(role["name"]) for role in roles]
        matrix = {
            role: {
                resource: {action: random.choice([True, False]) for action in actions}
                for resource in resources
            }
            for role in role_names
        }
        return {
            "resources": resources,
            "permissions": actions,
            "roles": role_names,
            "matrix": matrix,
        }


demo_permission_provider = DemoPermissionProvider()
