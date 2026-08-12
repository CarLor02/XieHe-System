"""Authenticated user directory HTTP routes."""

from typing import Any

from fastapi import APIRouter, Depends

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.infrastructure.persistence import (
    SqlAlchemyIdentityRepository,
)
from app.core.system.response import success_response

from ..dependencies import get_current_active_user, get_identity_repository

router = APIRouter()


@router.get("/users", response_model=dict[str, Any])
async def get_users(
    principal: AccessPrincipal = Depends(get_current_active_user),
    repository: SqlAlchemyIdentityRepository = Depends(get_identity_repository),
) -> dict[str, Any]:
    del principal
    return success_response(
        data={"users": repository.list_users()}, message="获取用户列表成功"
    )
