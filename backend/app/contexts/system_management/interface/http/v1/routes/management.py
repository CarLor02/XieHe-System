"""系统配置、统计和健康检查 HTTP 适配器。"""

from dataclasses import asdict
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.contexts.system_management.application import (
    SystemManagementApplicationService,
)
from app.core.access.auth import get_current_active_user
from app.core.system.response import success_response

from ..dependencies import get_system_management_service
from ..schemas import SystemConfigResponse, SystemHealthResponse, SystemStatsResponse

router = APIRouter()


@router.get("/configs", response_model=dict[str, Any], summary="获取系统配置")
async def get_system_configs(
    config_type: str | None = Query(None, description="配置类型筛选"),
    is_system: bool | None = Query(None, description="是否系统配置"),
    _: dict[str, Any] = Depends(get_current_active_user),
    service: SystemManagementApplicationService = Depends(
        get_system_management_service
    ),
) -> dict[str, Any]:
    try:
        configs = service.list_configs(
            config_type=config_type,
            is_system=is_system,
        )
        return success_response(
            data=[
                SystemConfigResponse(**asdict(config)).model_dump()
                for config in configs
            ],
            message="获取系统配置成功",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取系统配置失败: {exc}",
        ) from exc


@router.get("/stats", response_model=dict[str, Any], summary="获取系统统计")
async def get_system_stats(
    _: dict[str, Any] = Depends(get_current_active_user),
    service: SystemManagementApplicationService = Depends(
        get_system_management_service
    ),
) -> dict[str, Any]:
    try:
        stats = service.get_stats()
        return success_response(
            data=SystemStatsResponse(**asdict(stats)).model_dump(),
            message="获取系统统计成功",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取系统统计失败: {exc}",
        ) from exc


@router.get("/health", response_model=dict[str, Any], summary="系统健康检查")
async def system_health(
    service: SystemManagementApplicationService = Depends(
        get_system_management_service
    ),
) -> dict[str, Any]:
    try:
        health = service.get_health()
        return success_response(
            data=SystemHealthResponse(
                status=health.status,
                components=health.components,
                timestamp=health.timestamp,
            ).model_dump(mode="json"),
            message="系统健康检查完成",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"系统健康检查失败: {exc}",
        ) from exc
