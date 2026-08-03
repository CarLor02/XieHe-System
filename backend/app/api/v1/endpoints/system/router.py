"""System-domain API router."""

from fastapi import APIRouter

from .handlers import dashboard, errors, health, monitoring, notifications

router = APIRouter()
router.include_router(dashboard.router, prefix="/dashboard", tags=["工作台仪表板"])

router.include_router(errors.router, prefix="/errors", tags=["错误报告与监控"])
router.include_router(
    notifications.router, prefix="/notifications", tags=["消息通知系统"]
)
router.include_router(monitoring.router, prefix="/monitoring", tags=["系统性能监控"])
router.include_router(health.router, prefix="/health", tags=["健康检查"])
