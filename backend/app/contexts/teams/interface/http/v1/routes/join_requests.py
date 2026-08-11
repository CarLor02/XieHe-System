"""Team join-request routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.teams.application import TeamJoinRequestService
from app.contexts.teams.domain import JoinRequestStatus, TeamDomainError
from app.core.system.response import success_response

from ..dependencies import get_team_join_request_service
from ..errors import actor_id, domain_http_error, log_failure
from ..schemas import (
    TeamJoinRequestCreate,
    TeamJoinRequestItem,
    TeamJoinRequestReviewRequest,
)

router = APIRouter()


@router.post(
    "/teams/{team_id}/apply", response_model=dict[str, Any], summary="申请加入团队"
)
async def apply_to_team(
    team_id: int,
    request: TeamJoinRequestCreate,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamJoinRequestService = Depends(get_team_join_request_service),
) -> dict[str, Any]:
    try:
        item = await service.apply_to_team(
            team_id, actor_id(current_user), request.message
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("申请加入团队", exc)
        raise HTTPException(status_code=500, detail="申请失败，请稍后重试") from exc
    return success_response(
        data={
            "request_id": item["id"],
            "status": item["status"],
            "requested_at": item["requested_at"],
        },
        message="申请已提交，等待团队审核",
    )


@router.get(
    "/teams/{team_id}/join-requests",
    response_model=dict[str, Any],
    summary="获取团队加入申请列表",
)
async def list_team_join_requests(
    team_id: int,
    status: str | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamJoinRequestService = Depends(get_team_join_request_service),
) -> dict[str, Any]:
    status_value = None
    if status:
        try:
            status_value = JoinRequestStatus(status.upper())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        items = await service.list_join_requests(
            team_id, actor_id(current_user), status_value
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("获取团队加入申请", exc)
        raise HTTPException(
            status_code=500, detail="获取加入申请失败，请稍后重试"
        ) from exc
    serialized = [
        TeamJoinRequestItem.model_validate(item).model_dump(mode="json")
        for item in items
    ]
    return success_response(
        data={
            "items": serialized,
            "total": len(serialized),
            "pending_count": sum(item["status"] == "PENDING" for item in serialized),
        },
        message="获取加入申请列表成功",
    )


@router.post(
    "/teams/{team_id}/join-requests/{request_id}/review",
    response_model=dict[str, Any],
    summary="审核团队加入申请",
)
async def review_team_join_request(
    team_id: int,
    request_id: int,
    request: TeamJoinRequestReviewRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamJoinRequestService = Depends(get_team_join_request_service),
) -> dict[str, Any]:
    try:
        item = await service.review_join_request(
            team_id, request_id, actor_id(current_user), request.decision
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("审核团队加入申请", exc)
        raise HTTPException(status_code=500, detail="审核失败，请稍后重试") from exc
    serialized = TeamJoinRequestItem.model_validate(item).model_dump(mode="json")
    return success_response(
        data={"status": serialized["status"], "request": serialized},
        message=(
            "加入申请已通过" if serialized["status"] == "APPROVED" else "加入申请已拒绝"
        ),
    )


@router.delete(
    "/teams/{team_id}/join-requests/{request_id}",
    response_model=dict[str, Any],
    summary="撤销团队加入申请",
)
async def cancel_team_join_request(
    team_id: int,
    request_id: int,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamJoinRequestService = Depends(get_team_join_request_service),
) -> dict[str, Any]:
    try:
        item = await service.cancel_join_request(
            team_id, request_id, actor_id(current_user)
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("撤销团队加入申请", exc)
        raise HTTPException(status_code=500, detail="撤销失败，请稍后重试") from exc
    serialized = TeamJoinRequestItem.model_validate(item).model_dump(mode="json")
    return success_response(
        data={"status": serialized["status"], "request": serialized},
        message="申请已撤销",
    )
