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
    reports,
    system,
    websocket,
    dashboard,
    errors,
    notifications,
    monitoring
)

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
    reports.router,
    prefix="/reports",
    tags=["报告管理"]
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

api_router.include_router(
    dashboard.router,
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
