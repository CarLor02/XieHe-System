"""Team invitation routes."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.teams.application import TeamInvitationService
from app.contexts.teams.domain import TeamDomainError
from app.core.system.response import success_response

from ..dependencies import get_team_invitation_service
from ..errors import actor_id, domain_http_error, log_failure
from ..schemas import (
    TeamInvitationItem,
    TeamInvitationRespondRequest,
    TeamInviteRequest,
)

router = APIRouter()


@router.post(
    "/teams/{team_id}/invite",
    response_model=dict[str, Any],
    summary="邀请成员加入团队",
)
async def invite_team_member(
    team_id: int,
    request: TeamInviteRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamInvitationService = Depends(get_team_invitation_service),
) -> dict[str, Any]:
    try:
        item = await service.invite_member(
            team_id,
            actor_id(current_user),
            str(request.email),
            request.role,
            request.message,
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("邀请团队成员", exc)
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


@router.get(
    "/invitations/my", response_model=dict[str, Any], summary="获取我的团队邀请"
)
async def get_my_invitations(
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: TeamInvitationService = Depends(get_team_invitation_service),
) -> dict[str, Any]:
    try:
        items = await service.list_invitations(actor_id(current_user))
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("获取团队邀请", exc)
        raise HTTPException(
            status_code=500, detail="获取邀请列表失败，请稍后重试"
        ) from exc
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
    service: TeamInvitationService = Depends(get_team_invitation_service),
) -> dict[str, Any]:
    try:
        data = await service.respond_to_invitation(
            invitation_id, actor_id(current_user), request.accept
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("响应团队邀请", exc)
        raise HTTPException(status_code=500, detail="处理邀请失败，请稍后重试") from exc
    return success_response(data=data, message="邀请响应成功")
