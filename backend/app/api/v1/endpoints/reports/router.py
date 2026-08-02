"""Reports-domain API router."""

from fastapi import APIRouter

from .handlers import management

router = APIRouter()
router.include_router(management.router, prefix="/reports", tags=["报告管理"])
