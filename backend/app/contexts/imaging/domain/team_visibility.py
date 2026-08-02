"""影像团队归属的纯领域规则。"""

from __future__ import annotations

from .errors import ImageTeamAssignmentDeniedError


def normalize_team_ids(team_ids: list[int] | None) -> list[int]:
    """返回稳定、去重且为正数的团队 ID。"""

    if not team_ids:
        return []
    return sorted({int(team_id) for team_id in team_ids if int(team_id) > 0})


def require_all_teams_assignable(
    requested_team_ids: list[int],
    assignable_team_ids: set[int] | frozenset[int],
) -> None:
    """保证规范化后的每个团队都处于当前用户可分配范围。"""

    if any(team_id not in assignable_team_ids for team_id in requested_team_ids):
        raise ImageTeamAssignmentDeniedError("无权设置影像团队归属")
