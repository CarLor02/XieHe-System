"""Team member routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.teams.application import TeamMembershipService, TeamQueryService
from app.contexts.teams.domain import TeamDomainError
from app.core.system.response import ApiResponse, success_response

from ..dependencies import get_team_membership_service, get_team_query_service
from ..errors import actor_id, domain_http_error, log_failure
from ..schemas import TeamMember, TeamSummary
from ..schemas.members_requests import (
    RequestListTeamMembers,
    RequestRemoveTeamMember,
    RequestUpdateTeamMemberRole,
)
from ..schemas.results import TeamMembersResult

router = APIRouter()


@router.post(
    "/teams/members/list",
    summary="查看团队成员",
    response_model=ApiResponse[TeamMembersResult],
    operation_id="list_team_members",
)
async def list_team_members(
    request: RequestListTeamMembers,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamQueryService = Depends(get_team_query_service),
) -> dict[str, object]:
    try:
        data = await service.get_team_members(request.team_id, actor_id(current_user))
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


@router.post(
    "/teams/members/update-role",
    summary="修改团队成员角色",
    response_model=ApiResponse[None],
    operation_id="update_team_member_role",
)
async def update_team_member_role(
    request: RequestUpdateTeamMemberRole,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamMembershipService = Depends(get_team_membership_service),
) -> dict[str, object]:
    try:
        await service.update_member_role(
            request.team_id, actor_id(current_user), request.user_id, request.role
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("变更团队成员角色", exc)
        raise HTTPException(status_code=500, detail="角色变更失败，请稍后重试") from exc
    return success_response(data=None, message="角色已更新")


@router.post(
    "/teams/members/remove",
    summary="删除团队成员",
    response_model=ApiResponse[None],
    operation_id="remove_team_member",
)
async def remove_team_member(
    request: RequestRemoveTeamMember,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamMembershipService = Depends(get_team_membership_service),
) -> dict[str, object]:
    try:
        await service.remove_member(
            request.team_id, actor_id(current_user), request.user_id
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("删除团队成员", exc)
        raise HTTPException(status_code=500, detail="删除成员失败，请稍后重试") from exc
    return success_response(data=None, message="成员已删除")
