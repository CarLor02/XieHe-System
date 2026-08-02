"""影像访问范围和值对象，不依赖认证框架或数据库实现。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class ImageAccessActor:
    """已经由接口层规范化的影像操作人。"""

    user_id: int | None
    unrestricted: bool = False


@dataclass(frozen=True, slots=True)
class ImageAccessScope:
    """一次请求内稳定的访问范围。

    managed_team_ids 只包含当前用户作为活跃管理员加入的团队；普通团队成员
    不会因此获得其他成员影像的访问权限。
    """

    actor_id: int | None
    unrestricted: bool
    managed_team_ids: frozenset[int]


@dataclass(frozen=True, slots=True)
class ImageAccessTarget:
    """领域策略判断所需的最小影像权限事实。"""

    uploader_id: int
    team_ids: frozenset[int]


def build_image_access_scope(
    actor: ImageAccessActor,
    managed_team_ids: set[int] | frozenset[int],
) -> ImageAccessScope:
    """根据认证身份和团队管理事实创建不可变访问范围。"""

    return ImageAccessScope(
        actor_id=actor.user_id,
        unrestricted=actor.unrestricted,
        managed_team_ids=frozenset(managed_team_ids),
    )


def can_view_image(scope: ImageAccessScope, target: ImageAccessTarget) -> bool:
    """判断影像是否可见，明确归属团队而非上传者团队决定团队可见性。"""

    if scope.unrestricted:
        return True
    if scope.actor_id is None:
        return False
    return scope.actor_id == target.uploader_id or bool(
        scope.managed_team_ids & target.team_ids
    )


def can_modify_image(scope: ImageAccessScope, target: ImageAccessTarget) -> bool:
    """判断影像是否可修改。

    当前业务要求修改权限与查看权限一致，但保留独立入口，避免未来开放团队
    只读访问时意外放开标注、裁剪或删除权限。
    """

    return can_view_image(scope, target)


def can_choose_image_uploader(scope: ImageAccessScope) -> bool:
    """系统管理员或至少管理一个活跃团队的用户可切换上传者视角。"""

    return scope.unrestricted or bool(scope.managed_team_ids)
