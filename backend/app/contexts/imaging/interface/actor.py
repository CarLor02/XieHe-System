"""把认证接口返回的数据转换为影像领域身份。"""

from __future__ import annotations

from typing import Any

from app.contexts.imaging.domain import ImageAccessActor


def image_access_actor(current_user: dict[str, Any]) -> ImageAccessActor:
    """隔离认证字典兼容字段，避免其进入 application/domain。"""

    value = current_user.get("id") or current_user.get("user_id")
    try:
        user_id = int(value) if value is not None else None
    except (TypeError, ValueError):
        user_id = None
    return ImageAccessActor(
        user_id=user_id,
        unrestricted=bool(
            current_user.get("is_superuser", False)
            or current_user.get("is_system_admin", False)
        ),
    )
