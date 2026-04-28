"""
API v1 主路由配置

按业务域聚合 API v1 路由。
"""

from fastapi import APIRouter

from .endpoints.access import router as access_router
from .endpoints.imaging import router as imaging_router
from .endpoints.patients import router as patients_router
from .endpoints.reports import router as reports_router
from .endpoints.system import router as system_router

api_router = APIRouter()
api_router.include_router(access_router)
api_router.include_router(patients_router)
api_router.include_router(imaging_router)
api_router.include_router(reports_router)
api_router.include_router(system_router)
