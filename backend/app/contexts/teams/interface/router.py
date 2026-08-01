"""Mounted team-context routes with legacy-compatible API paths."""

from fastapi import APIRouter

from . import management

router = APIRouter()
router.include_router(management.router, prefix="/permissions", tags=["权限管理"])
