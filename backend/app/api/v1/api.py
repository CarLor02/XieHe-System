"""
API v1 主路由配置

按业务域聚合 API v1 路由。
"""

from fastapi import APIRouter

from app.contexts.access_control.interface import router as access_control_router
from app.contexts.dashboard.interface import router as dashboard_router
from app.contexts.imaging.interface import router as imaging_context_router
from app.contexts.model_management.interface import router as model_management_router
from app.contexts.patients.interface import router as patients_router
from app.contexts.reports.interface import router as report_generation_router
from app.contexts.system_management.interface import router as system_management_router
from app.contexts.teams.interface import router as teams_router
from app.core.system.response import ErrorResponse

from .endpoints.system import router as system_router

# 异常处理器实际返回统一错误信封，覆盖 FastAPI 默认的 HTTPValidationError 文档。
api_router = APIRouter(
    responses={
        code: {"model": ErrorResponse}
        for code in (400, 401, 403, 404, 409, 422, 429, 500, 502, 503)
    }
)
api_router.include_router(access_control_router)
api_router.include_router(dashboard_router)
api_router.include_router(patients_router)
api_router.include_router(teams_router)
api_router.include_router(report_generation_router)
api_router.include_router(model_management_router)
api_router.include_router(imaging_context_router)
api_router.include_router(system_management_router)
api_router.include_router(system_router)
