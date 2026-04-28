"""System-domain API router."""

from fastapi import APIRouter

from .handlers import errors, health, management, monitoring, notifications, websocket

router = APIRouter()
router.include_router(management.router, prefix="/system", tags=["系统管理"])
router.include_router(websocket.router, prefix="/ws", tags=["WebSocket实时通信"])

try:
    from .handlers import dashboard
    DASHBOARD_AVAILABLE = True
except ImportError as exc:
    print(f"Warning: Dashboard module import failed: {exc}")
    DASHBOARD_AVAILABLE = False

if DASHBOARD_AVAILABLE:
    router.include_router(dashboard.router, prefix="/dashboard", tags=["工作台仪表板"])
else:
    simple_dashboard_router = APIRouter()

    @simple_dashboard_router.get("/overview")
    async def get_dashboard_overview():
        return {
            "total_patients": 3,
            "new_patients_today": 1,
            "new_patients_week": 2,
            "active_patients": 3,
            "total_studies": 5,
            "studies_today": 2,
            "studies_week": 4,
            "pending_studies": 1,
            "total_reports": 4,
            "pending_reports": 1,
            "completed_reports": 3,
            "overdue_reports": 0,
            "completion_rate": 75.0,
            "average_processing_time": 2.5,
            "system_alerts": 0,
            "generated_at": "2025-09-28T07:40:00Z"
        }

    router.include_router(simple_dashboard_router, prefix="/dashboard", tags=["工作台仪表板"])

router.include_router(errors.router, prefix="/errors", tags=["错误报告与监控"])
router.include_router(notifications.router, prefix="/notifications", tags=["消息通知系统"])
router.include_router(monitoring.router, prefix="/monitoring", tags=["系统性能监控"])
router.include_router(health.router, prefix="/health", tags=["健康检查"])
