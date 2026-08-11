"""Mounted team-context routes with legacy-compatible API paths."""

from fastapi import APIRouter

from .routes import invitations, join_requests, members, teams

router = APIRouter()
for route_module in (teams, join_requests, members, invitations):
    router.include_router(
        route_module.router,
        prefix="/permissions",
        tags=["权限管理"],
    )
