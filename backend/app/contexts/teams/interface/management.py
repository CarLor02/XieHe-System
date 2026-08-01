"""Thin FastAPI adapter for team collaboration use cases."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query

from app.contexts.teams.application import TeamApplicationService
from app.contexts.teams.domain import (
    InvitationNotFound,
    JoinRequestNotFound,
    JoinRequestStatus,
    TeamConflict,
    TeamDomainError,
    TeamNotFound,
    TeamPermissionDenied,
    TeamUserNotFound,
    TeamValidationError,
)
from app.core.access.auth import get_current_active_user
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response

from .dependencies import get_team_service
from .schemas import (
    MemberRoleUpdateRequest,
    TeamCreateRequest,
    TeamInvitationItem,
    TeamInvitationRespondRequest,
    TeamInviteRequest,
    TeamJoinRequestCreate,
    TeamJoinRequestItem,
    TeamJoinRequestReviewRequest,
    TeamMember,
    TeamSummary,
    TeamUpdateRequest,
)

router = APIRouter()


def _actor_id(current_user: dict[str, Any]) -> int:
    value = current_user.get("id") or current_user.get("user_id")
    if value is None:
        raise HTTPException(status_code=400, detail="无效的用户ID")
    return int(value)


def _domain_http_error(exc: TeamDomainError) -> HTTPException:
    if isinstance(exc, TeamPermissionDenied):
        return HTTPException(status_code=403, detail=str(exc))
    if isinstance(
        exc, (TeamNotFound, TeamUserNotFound, JoinRequestNotFound, InvitationNotFound)
    ):
        return HTTPException(status_code=404, detail=str(exc))
    if isinstance(exc, (TeamConflict, TeamValidationError)):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=400, detail=str(exc))


def _log_failure(operation: str, exc: Exception) -> None:
    logger.emit_event(LogLevel.ERROR, message=f"{operation}失败: {exc}")


@router.post("/teams", response_model=dict[str, Any], status_code=201, summary="创建团队")
async def create_team(
    request: TeamCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        data = await service.create_team(
            _actor_id(current_user), request.model_dump()
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("创建团队", exc)
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
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        data = await service.update_team(
            team_id,
            _actor_id(current_user),
            request.model_dump(exclude_unset=True),
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("更新团队", exc)
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
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        results = await service.search_teams(
            keyword, _actor_id(current_user), limit
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("团队搜索", exc)
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
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        items = await service.list_user_teams(_actor_id(current_user))
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("获取我的团队", exc)
        raise HTTPException(status_code=500, detail="获取团队信息失败，请稍后重试") from exc
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


@router.post("/teams/{team_id}/apply", response_model=dict[str, Any], summary="申请加入团队")
async def apply_to_team(
    team_id: int,
    request: TeamJoinRequestCreate,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        item = await service.apply_to_team(
            team_id, _actor_id(current_user), request.message
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("申请加入团队", exc)
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
    service: TeamApplicationService = Depends(get_team_service),
):
    status_value = None
    if status:
        try:
            status_value = JoinRequestStatus(status.upper())
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    try:
        items = await service.list_join_requests(
            team_id, _actor_id(current_user), status_value
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("获取团队加入申请", exc)
        raise HTTPException(status_code=500, detail="获取加入申请失败，请稍后重试") from exc
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
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        item = await service.review_join_request(
            team_id, request_id, _actor_id(current_user), request.decision
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("审核团队加入申请", exc)
        raise HTTPException(status_code=500, detail="审核失败，请稍后重试") from exc
    serialized = TeamJoinRequestItem.model_validate(item).model_dump(mode="json")
    return success_response(
        data={"status": serialized["status"], "request": serialized},
        message=("加入申请已通过" if serialized["status"] == "APPROVED" else "加入申请已拒绝"),
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
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        item = await service.cancel_join_request(
            team_id, request_id, _actor_id(current_user)
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("撤销团队加入申请", exc)
        raise HTTPException(status_code=500, detail="撤销失败，请稍后重试") from exc
    serialized = TeamJoinRequestItem.model_validate(item).model_dump(mode="json")
    return success_response(
        data={"status": serialized["status"], "request": serialized},
        message="申请已撤销",
    )


@router.get("/teams/{team_id}/members", response_model=dict[str, Any], summary="查看团队成员")
async def list_team_members(
    team_id: int,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        data = await service.get_team_members(team_id, _actor_id(current_user))
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("获取团队成员", exc)
        raise HTTPException(status_code=500, detail="获取团队成员失败，请稍后重试") from exc
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
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        await service.update_member_role(
            team_id, _actor_id(current_user), user_id, request.role
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("变更团队成员角色", exc)
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
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        await service.remove_member(team_id, _actor_id(current_user), user_id)
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("删除团队成员", exc)
        raise HTTPException(status_code=500, detail="删除成员失败，请稍后重试") from exc
    return success_response(data=None, message="成员已删除")


@router.post(
    "/teams/{team_id}/invite",
    response_model=dict[str, Any],
    summary="邀请成员加入团队",
)
async def invite_team_member(
    team_id: int,
    request: TeamInviteRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        item = await service.invite_member(
            team_id,
            _actor_id(current_user),
            str(request.email),
            request.role,
            request.message,
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("邀请团队成员", exc)
        raise HTTPException(status_code=500, detail="发送邀请失败，请稍后重试") from exc
    return success_response(
        data={
            "status": item["status"],
            "invitation_id": item["id"],
            "invitee_email": item["invitee_email"],
            "expires_at": item["expires_at"],
        },
        message="邀请已发送",
    )


@router.get("/invitations/my", response_model=dict[str, Any], summary="获取我的团队邀请")
async def get_my_invitations(
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        items = await service.list_invitations(_actor_id(current_user))
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("获取团队邀请", exc)
        raise HTTPException(status_code=500, detail="获取邀请列表失败，请稍后重试") from exc
    serialized = [
        TeamInvitationItem.model_validate(item).model_dump(mode="json")
        for item in items
    ]
    return success_response(
        data={"items": serialized, "total": len(serialized)},
        message="获取邀请列表成功",
    )


@router.post(
    "/invitations/{invitation_id}/respond",
    response_model=dict[str, Any],
    summary="响应团队邀请",
)
async def respond_to_invitation(
    invitation_id: int,
    request: TeamInvitationRespondRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamApplicationService = Depends(get_team_service),
):
    try:
        data = await service.respond_to_invitation(
            invitation_id, _actor_id(current_user), request.accept
        )
    except TeamDomainError as exc:
        raise _domain_http_error(exc) from exc
    except Exception as exc:
        _log_failure("响应团队邀请", exc)
        raise HTTPException(status_code=500, detail="处理邀请失败，请稍后重试") from exc
    return success_response(data=data, message="邀请响应成功")
