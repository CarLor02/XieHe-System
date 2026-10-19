"""Team lifecycle and discovery routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.teams.application import TeamManagementService, TeamQueryService
from app.contexts.teams.domain import TeamDomainError
from app.core.system.response import ApiResponse, success_response

from ..dependencies import get_team_management_service, get_team_query_service
from ..errors import actor_id, domain_http_error, log_failure
from ..schemas import TeamCreateRequest, TeamSummary
from ..schemas.results import MyTeamsResult, TeamSearchResult
from ..schemas.teams_requests import (
    RequestListMyTeams,
    RequestSearchTeams,
    RequestUpdateTeam,
)

router = APIRouter()


@router.post(
    "/teams/create",
    status_code=201,
    summary="创建团队",
    response_model=ApiResponse[TeamSummary],
    operation_id="create_team",
)
async def create_team(
    request: TeamCreateRequest,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamManagementService = Depends(get_team_management_service),
) -> dict[str, object]:
    try:
        data = await service.create_team(actor_id(current_user), request.model_dump())
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("创建团队", exc)
        raise HTTPException(status_code=500, detail="创建团队失败，请稍后重试") from exc
    return success_response(
        data=TeamSummary.model_validate(data).model_dump(mode="json"),
        message="团队创建成功",
    )


@router.post(
    "/teams/update",
    summary="更新团队信息",
    response_model=ApiResponse[TeamSummary],
    operation_id="update_team",
)
async def update_team(
    request: RequestUpdateTeam,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamManagementService = Depends(get_team_management_service),
) -> dict[str, object]:
    try:
        data = await service.update_team(
            request.team_id,
            actor_id(current_user),
            request.model_dump(exclude_unset=True, exclude={"team_id"}),
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("更新团队", exc)
        raise HTTPException(status_code=500, detail="更新团队失败，请稍后重试") from exc
    return success_response(
        data=TeamSummary.model_validate(data).model_dump(mode="json"),
        message="团队信息已更新",
    )


@router.post(
    "/teams/search",
    summary="搜索团队",
    response_model=ApiResponse[TeamSearchResult],
    operation_id="search_teams",
)
async def search_teams(
    request: RequestSearchTeams,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamQueryService = Depends(get_team_query_service),
) -> dict[str, object]:
    try:
        results = await service.search_teams(
            request.keyword, actor_id(current_user), request.limit
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("团队搜索", exc)
        raise HTTPException(status_code=500, detail="团队搜索失败，请稍后重试") from exc
    return success_response(
        data={
            "results": [
                TeamSummary.model_validate(item).model_dump(mode="json")
                for item in results
            ],
            "total": len(results),
        },
        message="搜索团队成功",
    )


@router.post(
    "/teams/my",
    summary="获取我的团队",
    response_model=ApiResponse[MyTeamsResult],
    operation_id="list_my_teams",
)
async def list_my_teams(
    request: RequestListMyTeams,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamQueryService = Depends(get_team_query_service),
) -> dict[str, object]:
    try:
        items = await service.list_user_teams(actor_id(current_user))
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("获取我的团队", exc)
        raise HTTPException(
            status_code=500, detail="获取团队信息失败，请稍后重试"
        ) from exc
    return success_response(
        data={
            "items": [
                TeamSummary.model_validate(item).model_dump(mode="json")
                for item in items
            ],
            "total": len(items),
        },
        message="获取我的团队成功",
    )
