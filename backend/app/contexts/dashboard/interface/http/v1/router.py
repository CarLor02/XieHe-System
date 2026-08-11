"""Dashboard HTTP v1 路由聚合。"""

from fastapi import APIRouter

from .routes.dashboard import router as dashboard_router

router = APIRouter()
router.include_router(dashboard_router, prefix="/dashboard", tags=["工作台仪表板"])
