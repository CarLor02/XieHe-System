"""
报告系统路由集成

集成所有报告相关的API路由

@author XieHe Medical System
@created 2025-09-24
"""

from fastapi import APIRouter
from app.api.v1.endpoints.reports import router as reports_router
from app.api.v1.endpoints.report_templates import router as templates_router
from app.api.v1.endpoints.report_export import router as export_router

# 创建主路由
router = APIRouter()

# 包含所有报告相关的子路由
router.include_router(reports_router, prefix="/reports", tags=["reports"])
router.include_router(templates_router, prefix="/report-templates", tags=["report-templates"])
router.include_router(export_router, prefix="/report-export", tags=["report-export"])
