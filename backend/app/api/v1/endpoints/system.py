"""
系统管理API端点

提供系统配置、日志监控、性能统计等功能的API接口。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import List, Optional
from datetime import datetime, timedelta
import psutil
import os

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.system import SystemConfig, SystemLog, SystemMonitor, SystemAlert, Notification
from pydantic import BaseModel

router = APIRouter()

# Pydantic模型
class SystemConfigResponse(BaseModel):
    config_key: str
    config_name: str
    config_value: str
    config_type: str
    data_type: str
    description: Optional[str] = None

class SystemStatsResponse(BaseModel):
    total_patients: int
    total_studies: int
    total_reports: int
    active_users: int
    system_uptime: str
    cpu_usage: float
    memory_usage: float
    disk_usage: float

class SystemHealthResponse(BaseModel):
    status: str
    components: dict
    timestamp: datetime

@router.get("/configs", response_model=List[SystemConfigResponse], summary="获取系统配置")
async def get_system_configs(
    config_type: Optional[str] = Query(None, description="配置类型筛选"),
    is_system: Optional[bool] = Query(None, description="是否系统配置"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
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

        configs = query.filter(SystemConfig.is_deleted == False).all()

        return [
            SystemConfigResponse(
                config_key=config.config_key,
                config_name=config.config_name,
                config_value=config.config_value or "",
                config_type=config.config_type,
                data_type=config.data_type,
                description=config.description
            )
            for config in configs
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取系统配置失败: {str(e)}"
        )

@router.get("/stats", response_model=SystemStatsResponse, summary="获取系统统计")
async def get_system_stats(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_active_user)
):
    """
    获取系统统计信息

    返回系统性能和使用统计
    """
    try:
        # 获取数据库统计
        total_patients = db.execute(text("SELECT COUNT(*) FROM patients WHERE is_deleted = 0")).scalar() or 0
        total_studies = db.execute(text("SELECT COUNT(*) FROM studies WHERE is_deleted = 0")).scalar() or 0
        total_reports = db.execute(text("SELECT COUNT(*) FROM reports WHERE is_deleted = 0")).scalar() or 0
        active_users = db.execute(text("SELECT COUNT(*) FROM users WHERE is_deleted = 0")).scalar() or 0

        # 获取系统资源使用情况
        cpu_usage = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')

        # 计算系统运行时间
        boot_time = psutil.boot_time()
        uptime_seconds = datetime.now().timestamp() - boot_time
        uptime_hours = int(uptime_seconds // 3600)
        uptime_minutes = int((uptime_seconds % 3600) // 60)
        uptime_str = f"{uptime_hours}小时{uptime_minutes}分钟"

        return SystemStatsResponse(
            total_patients=total_patients,
            total_studies=total_studies,
            total_reports=total_reports,
            active_users=active_users,
            system_uptime=uptime_str,
            cpu_usage=round(cpu_usage, 1),
            memory_usage=round(memory.percent, 1),
            disk_usage=round(disk.percent, 1)
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"获取系统统计失败: {str(e)}"
        )

@router.get("/health", response_model=SystemHealthResponse, summary="系统健康检查")
async def system_health(
    db: Session = Depends(get_db)
):
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
        except Exception as e:
            components["database"] = "unhealthy"
            overall_status = "unhealthy"

        # 检查磁盘空间
        disk = psutil.disk_usage('/')
        if disk.percent > 90:
            components["disk"] = "warning"
            if overall_status == "healthy":
                overall_status = "warning"
        elif disk.percent > 95:
            components["disk"] = "critical"
            overall_status = "unhealthy"
        else:
            components["disk"] = "healthy"

        # 检查内存使用
        memory = psutil.virtual_memory()
        if memory.percent > 85:
            components["memory"] = "warning"
            if overall_status == "healthy":
                overall_status = "warning"
        elif memory.percent > 95:
            components["memory"] = "critical"
            overall_status = "unhealthy"
        else:
            components["memory"] = "healthy"

        # 检查CPU使用
        cpu_usage = psutil.cpu_percent(interval=1)
        if cpu_usage > 80:
            components["cpu"] = "warning"
            if overall_status == "healthy":
                overall_status = "warning"
        elif cpu_usage > 95:
            components["cpu"] = "critical"
            overall_status = "unhealthy"
        else:
            components["cpu"] = "healthy"

        return SystemHealthResponse(
            status=overall_status,
            components=components,
            timestamp=datetime.now()
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"系统健康检查失败: {str(e)}"
        )
