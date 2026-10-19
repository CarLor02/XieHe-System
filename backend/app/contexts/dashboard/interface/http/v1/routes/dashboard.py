"""Dashboard 查询 HTTP 适配。"""

from __future__ import annotations

from dataclasses import asdict
from typing import Callable, TypeVar

from fastapi import APIRouter, Depends, HTTPException

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.dashboard.application import DashboardQueryService
from app.core.system.logger import LogLevel, logger
from app.core.system.response import ApiResponse, success_response

from ..dependencies import get_dashboard_query_service
from ..schemas import DashboardOverview, RecentActivity
from ..schemas.dashboard import RecentActivitiesResult
from ..schemas.dashboard_requests import (
    RequestGetDashboardOverview,
    RequestGetDashboardStats,
    RequestGetRecentActivities,
)

router = APIRouter()
Result = TypeVar("Result")


def _execute(operation: Callable[[], Result], *, detail: str) -> Result:
    try:
        return operation()
    except HTTPException:
        raise
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"{detail}: {exc}")
        raise HTTPException(status_code=500, detail=detail) from exc


@router.post(
    "/overview",
    summary="获取仪表板概览",
    response_model=ApiResponse[DashboardOverview],
    operation_id="get_dashboard_overview",
)
async def get_dashboard_overview(
    request: RequestGetDashboardOverview,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, object]:
    overview = _execute(
        lambda: service.overview(current_user), detail="获取仪表板概览过程中发生错误"
    )
    response = DashboardOverview(**asdict(overview))
    return success_response(data=response.model_dump(), message="获取仪表板概览成功")


@router.post(
    "/recent-activities",
    summary="获取最近活动",
    response_model=ApiResponse[RecentActivitiesResult],
    operation_id="get_recent_activities",
)
async def get_recent_activities(
    request: RequestGetRecentActivities,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, object]:
    activities = _execute(
        lambda: service.recent_activities(current_user, limit=request.limit),
        detail="获取最近活动过程中发生错误",
    )
    items = [RecentActivity(**asdict(item)).model_dump() for item in activities]
    return success_response(
        data={"activities": items, "total": len(items)}, message="获取最近活动成功"
    )


@router.post(
    "/stats",
    summary="获取仪表板统计数据",
    response_model=ApiResponse[DashboardOverview],
    operation_id="get_dashboard_stats",
)
async def get_dashboard_stats(
    request: RequestGetDashboardStats,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, object]:
    overview = _execute(
        lambda: service.overview(current_user),
        detail="获取仪表板统计数据过程中发生错误",
    )
    response = DashboardOverview(**asdict(overview))
    return success_response(
        data=response.model_dump(), message="获取仪表板统计数据成功"
    )
