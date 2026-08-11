"""Operational health HTTP adapter."""

import time
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.contexts.system_management.application import (
    HealthCheckApplicationService,
    UnknownHealthComponentError,
    UnsupportedComponentTestError,
)
from app.contexts.system_management.application.dto import ComponentHealth
from app.core.config import settings
from app.core.system.response import success_response

from ..dependencies import get_health_check_service
from ..schemas import (
    ComponentHealthResponse,
    DetailedHealthResponse,
    HealthStatusResponse,
)

router = APIRouter()


def _component_response(component: ComponentHealth) -> ComponentHealthResponse:
    return ComponentHealthResponse(
        name=component.name,
        status=component.status,
        response_time=component.response_time,
        details=component.details,
        last_check=component.last_check.isoformat(),
    )


@router.get("/", response_model=dict[str, Any])
async def basic_health_check() -> dict[str, Any]:
    import app

    payload = HealthStatusResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        uptime=time.time() - getattr(app, "start_time", time.time()),
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )
    return success_response(data=payload.model_dump(), message="系统健康")


@router.get("/detailed", response_model=dict[str, Any])
async def detailed_health_check(
    service: HealthCheckApplicationService = Depends(get_health_check_service),
) -> dict[str, Any]:
    result = await service.detailed()
    payload = DetailedHealthResponse(
        overall_status=result.overall_status,
        timestamp=result.timestamp.isoformat(),
        components=[_component_response(item) for item in result.components],
        system_info=result.system_info,
    )
    return success_response(data=payload.model_dump(), message="系统详细健康检查完成")


@router.get("/component/{component_name}")
async def check_component_health(
    component_name: str,
    service: HealthCheckApplicationService = Depends(get_health_check_service),
) -> dict[str, Any]:
    try:
        component = await service.check_component(component_name)
    except UnknownHealthComponentError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return success_response(
        data=_component_response(component).model_dump(),
        message=f"组件 {component_name} 健康检查完成",
    )


@router.get("/readiness")
async def readiness_check(
    service: HealthCheckApplicationService = Depends(get_health_check_service),
) -> dict[str, Any]:
    if not await service.ready():
        raise HTTPException(
            status_code=503,
            detail="Application not ready: Database not ready",
        )
    return success_response(
        data={"status": "ready", "timestamp": datetime.now().isoformat()},
        message="Application is ready to serve traffic",
    )


@router.get("/liveness")
async def liveness_check() -> dict[str, Any]:
    return success_response(
        data={"status": "alive", "timestamp": datetime.now().isoformat()},
        message="Application is alive",
    )


@router.get("/metrics")
async def health_metrics(
    service: HealthCheckApplicationService = Depends(get_health_check_service),
) -> dict[str, Any]:
    try:
        return success_response(data=service.metrics(), message="系统指标获取成功")
    except Exception as exc:
        raise HTTPException(
            status_code=500, detail=f"Failed to get metrics: {exc}"
        ) from exc


@router.post("/test/{component_name}")
async def test_component(
    component_name: str,
    service: HealthCheckApplicationService = Depends(get_health_check_service),
) -> dict[str, Any]:
    try:
        result = await service.test_component(component_name)
    except (UnknownHealthComponentError, UnsupportedComponentTestError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    data: dict[str, object] = {
        "component": result.component,
        "test_result": "passed" if result.passed else "failed",
    }
    if result.details:
        data["details"] = result.details
    if result.error:
        data["error"] = result.error
    return success_response(
        data=data,
        message=f"{component_name.capitalize()}测试通过"
        if result.passed
        else f"{component_name.capitalize()}测试失败",
        code=200 if result.passed else 500,
    )
