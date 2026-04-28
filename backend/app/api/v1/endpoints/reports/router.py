"""Reports-domain API router."""

from fastapi import APIRouter

from .handlers import generation, management

router = APIRouter()
router.include_router(management.router, prefix="/reports", tags=["报告管理"])
router.include_router(generation.router, prefix="/report-generation", tags=["报告生成"])
