"""Team member routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.teams.application import TeamMembershipService, TeamQueryService
from app.contexts.teams.domain import TeamDomainError
from app.core.system.response import success_response

from ..dependencies import get_team_membership_service, get_team_query_service
from ..errors import actor_id, domain_http_error, log_failure
from ..schemas import MemberRoleUpdateRequest, TeamMember, TeamSummary

router = APIRouter()


@router.get(
    "/teams/{team_id}/members", response_model=dict[str, Any], summary="查看团队成员"
)
async def list_team_members(
    team_id: int,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamQueryService = Depends(get_team_query_service),
) -> dict[str, Any]:
    try:
        data = await service.get_team_members(team_id, actor_id(current_user))
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("获取团队成员", exc)
        raise HTTPException(
            status_code=500, detail="获取团队成员失败，请稍后重试"
        ) from exc
    return success_response(
        data={
            "team": TeamSummary.model_validate(data["team"]).model_dump(mode="json"),
            "members": [
                TeamMember.model_validate(item).model_dump(mode="json")
                for item in data["members"]
            ],
        },
        message="获取团队成员成功",
    )


@router.patch(
    "/teams/{team_id}/members/{user_id}/role",
    response_model=dict[str, Any],
    summary="修改团队成员角色",
)
async def update_team_member_role(
    team_id: int,
    user_id: int,
    request: MemberRoleUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamMembershipService = Depends(get_team_membership_service),
) -> dict[str, Any]:
    try:
        await service.update_member_role(
            team_id, actor_id(current_user), user_id, request.role
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("变更团队成员角色", exc)
        raise HTTPException(status_code=500, detail="角色变更失败，请稍后重试") from exc
    return success_response(data=None, message="角色已更新")


@router.delete(
    "/teams/{team_id}/members/{user_id}",
    response_model=dict[str, Any],
    summary="删除团队成员",
)
async def remove_team_member(
    team_id: int,
    user_id: int,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamMembershipService = Depends(get_team_membership_service),
) -> dict[str, Any]:
    try:
        await service.remove_member(team_id, actor_id(current_user), user_id)
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("删除团队成员", exc)
        raise HTTPException(status_code=500, detail="删除成员失败，请稍后重试") from exc
    return success_response(data=None, message="成员已删除")
