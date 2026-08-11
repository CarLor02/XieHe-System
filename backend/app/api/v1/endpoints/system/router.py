"""System-domain API router."""

from fastapi import APIRouter

from .handlers import errors, monitoring, notifications

router = APIRouter()
router.include_router(errors.router, prefix="/errors", tags=["错误报告与监控"])
router.include_router(
    notifications.router, prefix="/notifications", tags=["消息通知系统"]
)
router.include_router(monitoring.router, prefix="/monitoring", tags=["系统性能监控"])
