"""Team lifecycle and discovery routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.contexts.teams.application import TeamManagementService, TeamQueryService
from app.contexts.teams.domain import TeamDomainError
from app.core.access.auth import get_current_active_user
from app.core.system.response import success_response

from ..dependencies import get_team_management_service, get_team_query_service
from ..errors import actor_id, domain_http_error, log_failure
from ..schemas import TeamCreateRequest, TeamSummary, TeamUpdateRequest

router = APIRouter()


@router.post(
    "/teams", response_model=dict[str, Any], status_code=201, summary="创建团队"
)
async def create_team(
    request: TeamCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamManagementService = Depends(get_team_management_service),
) -> dict[str, Any]:
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


@router.patch("/teams/{team_id}", response_model=dict[str, Any], summary="更新团队信息")
async def update_team(
    team_id: int,
    request: TeamUpdateRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamManagementService = Depends(get_team_management_service),
) -> dict[str, Any]:
    try:
        data = await service.update_team(
            team_id,
            actor_id(current_user),
            request.model_dump(exclude_unset=True),
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


@router.get("/teams/search", response_model=dict[str, Any], summary="搜索团队")
async def search_teams(
    keyword: str | None = Query(None),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamQueryService = Depends(get_team_query_service),
) -> dict[str, Any]:
    try:
        results = await service.search_teams(keyword, actor_id(current_user), limit)
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


@router.get("/teams/my", response_model=dict[str, Any], summary="获取我的团队")
async def list_my_teams(
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamQueryService = Depends(get_team_query_service),
) -> dict[str, Any]:
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
