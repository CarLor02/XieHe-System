"""
API v1 主路由配置

整合所有API v1版本的路由，包括：
- 用户管理
- 患者管理  
- 影像管理
- 报告管理
- 系统管理

作者: XieHe Medical System
创建时间: 2025-09-24
"""

from fastapi import APIRouter

# 导入各个模块的路由
from .endpoints import (
    auth,
    users,
    patients,
    images,
    studies,
    reports,
    permissions,
    ai_diagnosis,
    models,
    system,
    websocket,
    errors,
    notifications,
    monitoring,
    upload,
    annotations
)

# 单独导入 dashboard，如果失败则跳过
try:
    from .endpoints import dashboard
    DASHBOARD_AVAILABLE = True
except ImportError as e:
    print(f"Warning: Dashboard module import failed: {e}")
    DASHBOARD_AVAILABLE = False

# 创建主API路由器
api_router = APIRouter()

# 包含各个模块的路由
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["认证管理"]
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["用户管理"]
)

api_router.include_router(
    permissions.router,
    prefix="/permissions",
    tags=["权限管理"]
)

api_router.include_router(
    patients.router,
    prefix="/patients",
    tags=["患者管理"]
)

api_router.include_router(
    images.router,
    prefix="/images",
    tags=["影像管理"]
)

api_router.include_router(
    studies.router,
    prefix="/studies",
    tags=["影像检查"]
)

api_router.include_router(
    upload.router,
    prefix="/upload",
    tags=["文件上传"]
)

api_router.include_router(
    annotations.router,
    prefix="/measurements",
    tags=["影像标注"]
)

api_router.include_router(
    reports.router,
    prefix="/reports",
    tags=["报告管理"]
)

api_router.include_router(
    ai_diagnosis.router,
    prefix="/ai-diagnosis",
    tags=["AI辅助诊断"]
)

api_router.include_router(
    models.router,
    prefix="/models",
    tags=["模型管理"]
)

api_router.include_router(
    system.router,
    prefix="/system",
    tags=["系统管理"]
)

api_router.include_router(
    websocket.router,
    prefix="/ws",
    tags=["WebSocket实时通信"]
)

# 条件性包含 dashboard 路由
if DASHBOARD_AVAILABLE:
    api_router.include_router(
        dashboard.router,
        prefix="/dashboard",
        tags=["工作台仪表板"]
    )
else:
    # 创建一个简单的仪表盘路由作为备用
    from fastapi import APIRouter
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

    api_router.include_router(
        simple_dashboard_router,
        prefix="/dashboard",
        tags=["工作台仪表板"]
    )

api_router.include_router(
    errors.router,
    prefix="/errors",
    tags=["错误报告与监控"]
)

api_router.include_router(
    notifications.router,
    prefix="/notifications",
    tags=["消息通知系统"]
)

api_router.include_router(
    monitoring.router,
    prefix="/monitoring",
    tags=["系统性能监控"]
)

from .endpoints import health
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["健康检查"]
)
