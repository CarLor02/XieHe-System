"""Team invitation routes."""

from fastapi import APIRouter, Depends, HTTPException

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.teams.application import TeamInvitationService
from app.contexts.teams.domain import TeamDomainError
from app.core.system.response import ApiResponse, success_response

from ..dependencies import get_team_invitation_service
from ..errors import actor_id, domain_http_error, log_failure
from ..schemas import (
    TeamInvitationItem,
)
from ..schemas.invitations_requests import (
    RequestGetMyInvitations,
    RequestInviteTeamMember,
    RequestRespondToInvitation,
)
from ..schemas.results import (
    InvitationRespondResult,
    InviteTeamMemberResult,
    MyInvitationsResult,
)

router = APIRouter()


@router.post(
    "/teams/invite",
    summary="邀请成员加入团队",
    response_model=ApiResponse[InviteTeamMemberResult],
    operation_id="invite_team_member",
)
async def invite_team_member(
    request: RequestInviteTeamMember,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamInvitationService = Depends(get_team_invitation_service),
) -> dict[str, object]:
    try:
        item = await service.invite_member(
            request.team_id,
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


@router.post(
    "/invitations/my",
    summary="获取我的团队邀请",
    response_model=ApiResponse[MyInvitationsResult],
    operation_id="get_my_invitations",
)
async def get_my_invitations(
    request: RequestGetMyInvitations,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamInvitationService = Depends(get_team_invitation_service),
) -> dict[str, object]:
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
    "/invitations/respond",
    summary="响应团队邀请",
    response_model=ApiResponse[InvitationRespondResult],
    operation_id="respond_to_invitation",
)
async def respond_to_invitation(
    request: RequestRespondToInvitation,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: TeamInvitationService = Depends(get_team_invitation_service),
) -> dict[str, object]:
    try:
        data = await service.respond_to_invitation(
            request.invitation_id, actor_id(current_user), request.accept
        )
    except TeamDomainError as exc:
        raise domain_http_error(exc) from exc
    except Exception as exc:
        log_failure("响应团队邀请", exc)
        raise HTTPException(status_code=500, detail="处理邀请失败，请稍后重试") from exc
    return success_response(data=data, message="邀请响应成功")
