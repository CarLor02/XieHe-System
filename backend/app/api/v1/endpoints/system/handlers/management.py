"""
系统管理API端点

提供系统配置、日志监控、性能统计等功能的API接口。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import typing
from datetime import datetime
from typing import Any, Dict, Optional

import psutil
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.access.auth import get_current_active_user
from app.core.database.session import get_db
from app.core.system.response import success_response
from app.models.system import (
    SystemConfig,
)

router = APIRouter()


def _resource_health(percent: float, warning_at: float, critical_at: float) -> str:
    if percent > critical_at:
        return "critical"
    if percent > warning_at:
        return "warning"
    return "healthy"


def _merge_health_status(current: str, component: str) -> str:
    if component in {"critical", "unhealthy"}:
        return "unhealthy"
    if component == "warning" and current == "healthy":
        return "warning"
    return current


@router.get("/configs", response_model=Dict[str, Any], summary="获取系统配置")
async def get_system_configs(
    config_type: Optional[str] = Query(None, description="配置类型筛选"),
    is_system: Optional[bool] = Query(None, description="是否系统配置"),
    db: Session = Depends(get_db),
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
) -> dict[str, typing.Any]:
    """
    获取系统配置信息

    返回系统的配置参数
    """
    try:
        query = db.query(SystemConfig)

        if config_type:
            query = query.filter(SystemConfig.config_type == config_type.upper())

        if is_system is not None:
            query = query.filter(SystemConfig.is_system == is_system)

        configs = query.filter(SystemConfig.is_deleted.is_(False)).all()

        config_list = [
            {
                "config_key": config.config_key,
                "config_name": config.config_name,
                "config_value": config.config_value or "",
                "config_type": config.config_type,
                "data_type": config.data_type,
                "description": config.description,
            }
            for config in configs
        ]

        return success_response(data=config_list, message="获取系统配置成功")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取系统配置失败: {str(e)}",
        )


@router.get("/stats", response_model=Dict[str, Any], summary="获取系统统计")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
) -> dict[str, typing.Any]:
    """
    获取系统统计信息

    返回系统性能和使用统计
    """
    try:
        # 获取数据库统计
        total_patients = (
            db.execute(
                text("SELECT COUNT(*) FROM patients WHERE is_deleted = 0")
            ).scalar()
            or 0
        )
        total_studies = (
            db.execute(
                text("SELECT COUNT(*) FROM studies WHERE is_deleted = 0")
            ).scalar()
            or 0
        )
        total_reports = (
            db.execute(
                text("SELECT COUNT(*) FROM reports WHERE is_deleted = 0")
            ).scalar()
            or 0
        )
        active_users = (
            db.execute(text("SELECT COUNT(*) FROM users WHERE is_deleted = 0")).scalar()
            or 0
        )

        # 获取系统资源使用情况
        cpu_usage = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        # 计算系统运行时间
        boot_time = psutil.boot_time()
        uptime_seconds = datetime.now().timestamp() - boot_time
        uptime_hours = int(uptime_seconds // 3600)
        uptime_minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{uptime_hours}小时{uptime_minutes}分钟"

        stats_data = {
            "total_patients": total_patients,
            "total_studies": total_studies,
            "total_reports": total_reports,
            "active_users": active_users,
            "system_uptime": uptime_str,
            "cpu_usage": round(cpu_usage, 1),
            "memory_usage": round(memory.percent, 1),
            "disk_usage": round(disk.percent, 1),
        }

        return success_response(data=stats_data, message="获取系统统计成功")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取系统统计失败: {str(e)}",
        )


@router.get("/health", response_model=Dict[str, Any], summary="系统健康检查")
async def system_health(db: Session = Depends(get_db)) -> dict[str, typing.Any]:
    """
    系统健康检查

    检查各个系统组件的健康状态
    """
    try:
        components = {}
        overall_status = "healthy"

        # 检查数据库连接
        try:
            db.execute(text("SELECT 1"))
            components["database"] = "healthy"
        except Exception:
            components["database"] = "unhealthy"
            overall_status = "unhealthy"

        # 检查资源使用率；先判断 critical，避免被较低的 warning 阈值吞掉。
        disk = psutil.disk_usage("/")
        components["disk"] = _resource_health(disk.percent, 90, 95)
        overall_status = _merge_health_status(overall_status, components["disk"])

        memory = psutil.virtual_memory()
        components["memory"] = _resource_health(memory.percent, 85, 95)
        overall_status = _merge_health_status(overall_status, components["memory"])

        cpu_usage = psutil.cpu_percent(interval=None)
        components["cpu"] = _resource_health(cpu_usage, 80, 95)
        overall_status = _merge_health_status(overall_status, components["cpu"])

        health_data = {
            "status": overall_status,
            "components": components,
            "timestamp": datetime.now().isoformat(),
        }

        return success_response(data=health_data, message="系统健康检查完成")

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"系统健康检查失败: {str(e)}",
        )
