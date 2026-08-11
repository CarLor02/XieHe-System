"""系统管理 HTTP v1 路由聚合。"""

from fastapi import APIRouter

from .routes.health import router as health_router
from .routes.management import router as management_router

router = APIRouter()
router.include_router(management_router, prefix="/system", tags=["系统管理"])
router.include_router(health_router, prefix="/health", tags=["健康检查"])
