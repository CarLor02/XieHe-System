"""System-domain API router."""

from fastapi import APIRouter

from .handlers import errors

router = APIRouter()
router.include_router(errors.router, prefix="/errors", tags=["错误报告与监控"])
