"""Dashboard 查询 HTTP 适配。"""

from __future__ import annotations

from dataclasses import asdict
from typing import Any, Callable, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.dashboard.application import DashboardQueryService
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response

from ..dependencies import get_dashboard_query_service
from ..schemas import DashboardOverview, RecentActivity, SystemMetric

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


@router.get("/overview", response_model=dict[str, Any], summary="获取仪表板概览")
async def get_dashboard_overview(
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, Any]:
    overview = _execute(
        lambda: service.overview(current_user), detail="获取仪表板概览过程中发生错误"
    )
    response = DashboardOverview(**asdict(overview))
    return success_response(data=response.model_dump(), message="获取仪表板概览成功")


@router.get("/recent-activities", response_model=dict[str, Any], summary="获取最近活动")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50, description="返回数量限制"),
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, Any]:
    activities = _execute(
        lambda: service.recent_activities(current_user, limit=limit),
        detail="获取最近活动过程中发生错误",
    )
    items = [RecentActivity(**asdict(item)).model_dump() for item in activities]
    return success_response(
        data={"activities": items, "total": len(items)}, message="获取最近活动成功"
    )


@router.get("/system-metrics", response_model=dict[str, Any], summary="获取系统指标")
async def get_system_metrics(
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, Any]:
    del current_user
    metrics = _execute(service.system_metrics, detail="获取系统指标过程中发生错误")
    items = [SystemMetric(**item).model_dump() for item in metrics]
    return success_response(data={"metrics": items}, message="获取系统指标成功")


@router.get("/stats", response_model=dict[str, Any], summary="获取仪表板统计数据")
async def get_dashboard_stats(
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, Any]:
    overview = _execute(
        lambda: service.overview(current_user),
        detail="获取仪表板统计数据过程中发生错误",
    )
    response = DashboardOverview(**asdict(overview))
    return success_response(
        data=response.model_dump(), message="获取仪表板统计数据成功"
    )


@router.get("/tasks", response_model=dict[str, Any])
async def get_dashboard_tasks(
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: DashboardQueryService = Depends(get_dashboard_query_service),
) -> dict[str, Any]:
    del current_user
    tasks = _execute(service.tasks, detail="获取任务列表失败")
    return success_response(data={"tasks": tasks}, message="获取任务列表成功")
