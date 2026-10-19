"""系统配置、统计和健康检查 HTTP 适配器。"""

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.system_management.application import (
    SystemManagementApplicationService,
)
from app.core.system.response import ApiResponse, success_response

from ..dependencies import get_system_management_service
from ..schemas import SystemConfigResponse, SystemHealthResponse, SystemStatsResponse
from ..schemas.management_requests import RequestGetSystemConfigs, RequestGetSystemStats

router = APIRouter()


@router.post(
    "/configs",
    summary="获取系统配置",
    response_model=ApiResponse[list[SystemConfigResponse]],
    operation_id="get_system_configs",
)
async def get_system_configs(
    request: RequestGetSystemConfigs,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: SystemManagementApplicationService = Depends(
        get_system_management_service
    ),
) -> dict[str, object]:
    try:
        configs = service.list_configs(
            config_type=request.config_type,
            is_system=request.is_system,
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


@router.post(
    "/stats",
    summary="获取系统统计",
    response_model=ApiResponse[SystemStatsResponse],
    operation_id="get_system_stats",
)
async def get_system_stats(
    request: RequestGetSystemStats,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: SystemManagementApplicationService = Depends(
        get_system_management_service
    ),
) -> dict[str, object]:
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


@router.get(
    "/health",
    summary="系统健康检查",
    response_model=ApiResponse[SystemHealthResponse],
    operation_id="system_health",
)
async def system_health(
    service: SystemManagementApplicationService = Depends(
        get_system_management_service
    ),
) -> dict[str, object]:
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
