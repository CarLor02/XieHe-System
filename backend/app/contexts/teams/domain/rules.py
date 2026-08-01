"""Pure normalization rules shared by team use cases."""

from __future__ import annotations

from .errors import TeamValidationError
from .models import TeamRole


def require_user_id(user_id: int | str | None) -> int:
    """Normalize transport identity values before applying team rules."""

    try:
        if user_id is None:
            raise TypeError
        return int(user_id)
    except (TypeError, ValueError) as exc:
        raise TeamValidationError("无效的用户ID") from exc


def normalize_team_role(role: str | None) -> TeamRole:
    try:
        return TeamRole(role or TeamRole.MEMBER.value)
    except ValueError as exc:
        raise TeamValidationError(f"不支持的角色类型: {role}") from exc


def normalize_team_name(name: str) -> str:
    normalized = name.strip()
    if not normalized:
        raise TeamValidationError("团队名称不能为空")
    return normalized
