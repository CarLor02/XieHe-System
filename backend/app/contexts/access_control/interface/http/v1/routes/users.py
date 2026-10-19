"""Authenticated user directory HTTP routes."""

from fastapi import APIRouter, Depends

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.infrastructure.persistence import (
    SqlAlchemyIdentityRepository,
)
from app.core.system.response import ApiResponse, success_response

from ..dependencies import get_current_active_user, get_identity_repository
from ..schemas.auth import UserDirectoryResult
from ..schemas.users_requests import RequestGetUsers

router = APIRouter()


@router.post(
    "/users/list",
    response_model=ApiResponse[UserDirectoryResult],
    operation_id="get_users",
)
async def get_users(
    request: RequestGetUsers,
    principal: AccessPrincipal = Depends(get_current_active_user),
    repository: SqlAlchemyIdentityRepository = Depends(get_identity_repository),
) -> dict[str, object]:
    del principal
    return success_response(
        data={"users": repository.list_users()}, message="获取用户列表成功"
    )
