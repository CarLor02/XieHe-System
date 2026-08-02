"""把认证接口返回的数据转换为影像领域身份。"""

from __future__ import annotations

from typing import NotRequired, TypedDict

from app.contexts.imaging.domain import ImageAccessActor


class CurrentUserPayload(TypedDict):
    """影像接口实际读取的认证字段；认证模块仍兼容额外历史字段。"""

    id: NotRequired[int]
    user_id: NotRequired[int]
    username: NotRequired[str]
    is_superuser: NotRequired[bool]
    is_system_admin: NotRequired[bool]


def image_access_actor(current_user: CurrentUserPayload) -> ImageAccessActor:
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
