"""
健康检查接口

提供各组件状态监控和系统健康检查功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import time
import typing
from datetime import datetime
from typing import Any, Dict

import psutil
from fastapi import APIRouter, HTTPException
from sqlalchemy import text

from app.core.config import settings
from app.core.database.session import get_db
from app.core.system.response import success_response
from app.shared.cache.aiocache import query_cache
from app.shared.redis import state_redis

from ..schemas.health import (
    ComponentHealth,
    HealthStatus,
    SystemHealth,
)

router = APIRouter()


async def check_database_health() -> ComponentHealth:
    """检查数据库健康状态"""
    start_time = time.time()
    db_generator = get_db()
    try:
        db = next(db_generator)
        result = db.execute(text("SELECT 1")).fetchone()
        response_time = time.time() - start_time

        if result:
            return ComponentHealth(
                name="database",
                status="healthy",
                response_time=response_time * 1000,
                details={"connection_pool": "active", "query_test": "passed"},
                last_check=datetime.now().isoformat(),
            )
        return ComponentHealth(
            name="database",
            status="unhealthy",
            response_time=response_time * 1000,
            details={"connection_pool": "active", "query_test": "empty"},
            last_check=datetime.now().isoformat(),
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="database",
            status="unhealthy",
            response_time=response_time * 1000,
            details={"error": str(e), "connection_pool": "failed"},
            last_check=datetime.now().isoformat(),
        )
    finally:
        db_generator.close()


async def check_redis_health() -> ComponentHealth:
    """分别检查强一致状态实例和可丢弃查询缓存实例。"""
    start_time = time.time()
    state_ok, cache_ok = await asyncio.gather(
        state_redis.ping(),
        query_cache.ping() if query_cache.enabled else asyncio.sleep(0, result=True),
    )
    response_time = time.time() - start_time
    status_value = (
        "healthy"
        if state_ok and cache_ok
        else "unhealthy"
        if not state_ok
        else "warning"
    )
    return ComponentHealth(
        name="redis",
        status=status_value,
        response_time=response_time * 1000,
        details={
            "state": "healthy" if state_ok else "unhealthy",
            "query_cache": (
                "disabled"
                if not query_cache.enabled
                else "healthy"
                if cache_ok
                else "unavailable"
            ),
            "query_cache_fallback": not query_cache.enabled or not cache_ok,
        },
        last_check=datetime.now().isoformat(),
    )


async def check_file_system_health() -> ComponentHealth:
    """检查文件系统健康状态"""
    start_time = time.time()
    try:
        # 检查磁盘使用率
        disk_usage = psutil.disk_usage("/")
        disk_percent = (disk_usage.used / disk_usage.total) * 100

        # 检查上传目录
        upload_dir = "uploads"
        import os

        upload_accessible = os.path.exists(upload_dir) and os.access(
            upload_dir, os.W_OK
        )

        response_time = time.time() - start_time

        status = "healthy" if disk_percent < 90 and upload_accessible else "warning"

        return ComponentHealth(
            name="filesystem",
            status=status,
            response_time=response_time * 1000,
            details={
                "disk_usage_percent": round(disk_percent, 2),
                "upload_directory": "accessible"
                if upload_accessible
                else "inaccessible",
                "free_space_gb": round(disk_usage.free / (1024**3), 2),
            },
            last_check=datetime.now().isoformat(),
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="filesystem",
            status="unhealthy",
            response_time=response_time * 1000,
            details={"error": str(e)},
            last_check=datetime.now().isoformat(),
        )


async def check_memory_health() -> ComponentHealth:
    """检查内存健康状态"""
    start_time = time.time()
    try:
        memory = psutil.virtual_memory()
        memory_percent = memory.percent

        response_time = time.time() - start_time

        status = (
            "healthy"
            if memory_percent < 85
            else "warning"
            if memory_percent < 95
            else "critical"
        )

        return ComponentHealth(
            name="memory",
            status=status,
            response_time=response_time * 1000,
            details={
                "usage_percent": memory_percent,
                "available_gb": round(memory.available / (1024**3), 2),
                "total_gb": round(memory.total / (1024**3), 2),
            },
            last_check=datetime.now().isoformat(),
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="memory",
            status="unhealthy",
            response_time=response_time * 1000,
            details={"error": str(e)},
            last_check=datetime.now().isoformat(),
        )


async def check_cpu_health() -> ComponentHealth:
    """检查CPU健康状态"""
    start_time = time.time()
    try:
        # 使用非阻塞采样，避免详细健康检查在高频探测时卡住事件循环。
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_count = psutil.cpu_count()

        response_time = time.time() - start_time

        status = (
            "healthy"
            if cpu_percent < 80
            else "warning"
            if cpu_percent < 95
            else "critical"
        )

        return ComponentHealth(
            name="cpu",
            status=status,
            response_time=response_time * 1000,
            details={
                "usage_percent": cpu_percent,
                "cpu_count": cpu_count,
                "load_average": list(psutil.getloadavg())
                if hasattr(psutil, "getloadavg")
                else None,
            },
            last_check=datetime.now().isoformat(),
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="cpu",
            status="unhealthy",
            response_time=response_time * 1000,
            details={"error": str(e)},
            last_check=datetime.now().isoformat(),
        )


@router.get("/", response_model=Dict[str, Any])
async def basic_health_check() -> dict[str, typing.Any]:
    """基础健康检查"""
    import app

    return success_response(
        data=HealthStatus(
            status="healthy",
            timestamp=datetime.now().isoformat(),
            uptime=time.time() - getattr(app, "start_time", time.time()),
            version=getattr(settings, "VERSION", "1.0.0"),
            environment=getattr(settings, "ENVIRONMENT", "development"),
        ).dict(),
        message="系统健康",
    )


@router.get("/detailed", response_model=Dict[str, Any])
async def detailed_health_check() -> dict[str, typing.Any]:
    """详细健康检查"""
    # 并行检查所有组件
    components = await asyncio.gather(
        check_database_health(),
        check_redis_health(),
        check_file_system_health(),
        check_memory_health(),
        check_cpu_health(),
        return_exceptions=True,
    )

    # 过滤异常结果
    valid_components = [c for c in components if isinstance(c, ComponentHealth)]

    # 确定整体状态
    statuses = [c.status for c in valid_components]
    if "critical" in statuses or "unhealthy" in statuses:
        overall_status = "unhealthy"
    elif "warning" in statuses:
        overall_status = "warning"
    else:
        overall_status = "healthy"

    # 系统信息
    system_info = {
        "platform": psutil.WINDOWS if psutil.WINDOWS else "linux",
        "python_version": f"{psutil.version_info}",
        "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
        "process_count": len(psutil.pids()),
    }

    return success_response(
        data=SystemHealth(
            overall_status=overall_status,
            timestamp=datetime.now().isoformat(),
            components=valid_components,
            system_info=system_info,
        ).dict(),
        message="系统详细健康检查完成",
    )


@router.get("/component/{component_name}")
async def check_component_health(component_name: str) -> dict[str, typing.Any]:
    """检查特定组件健康状态"""
    component_checkers = {
        "database": check_database_health,
        "redis": check_redis_health,
        "filesystem": check_file_system_health,
        "memory": check_memory_health,
        "cpu": check_cpu_health,
    }

    if component_name not in component_checkers:
        raise HTTPException(
            status_code=404,
            detail=f"Component '{component_name}' not found. Available: {list(component_checkers.keys())}",
        )

    component_health = await component_checkers[component_name]()
    return success_response(
        data=component_health.dict(), message=f"组件 {component_name} 健康检查完成"
    )


@router.get("/readiness")
async def readiness_check() -> dict[str, typing.Any]:
    """就绪检查 - 检查应用是否准备好接收流量"""
    try:
        # 检查关键组件
        db_health = await check_database_health()

        if db_health.status == "unhealthy":
            raise HTTPException(status_code=503, detail="Database not ready")

        return success_response(
            data={"status": "ready", "timestamp": datetime.now().isoformat()},
            message="Application is ready to serve traffic",
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Application not ready: {str(e)}")


@router.get("/liveness")
async def liveness_check() -> dict[str, typing.Any]:
    """存活检查 - 检查应用是否还活着"""
    return success_response(
        data={"status": "alive", "timestamp": datetime.now().isoformat()},
        message="Application is alive",
    )


@router.get("/metrics")
async def health_metrics() -> dict[str, typing.Any]:
    """健康检查指标"""
    try:
        # 获取系统指标
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")

        # 网络统计
        network = psutil.net_io_counters()

        return success_response(
            data={
                "timestamp": datetime.now().isoformat(),
                "cpu": {"usage_percent": cpu_percent, "count": psutil.cpu_count()},
                "memory": {
                    "usage_percent": memory.percent,
                    "available_bytes": memory.available,
                    "total_bytes": memory.total,
                },
                "disk": {
                    "usage_percent": (disk.used / disk.total) * 100,
                    "free_bytes": disk.free,
                    "total_bytes": disk.total,
                },
                "network": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv,
                },
            },
            message="系统指标获取成功",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.post("/test/{component_name}")
async def test_component(component_name: str) -> dict[str, typing.Any]:
    """测试特定组件功能"""
    if component_name == "database":
        try:
            db = next(get_db())
            # 执行一个简单的查询测试
            result = db.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            return success_response(
                data={
                    "component": component_name,
                    "test_result": "passed",
                    "details": {"user_count": result[0] if result else 0},
                },
                message="数据库测试通过",
            )
        except Exception as e:
            return success_response(
                data={
                    "component": component_name,
                    "test_result": "failed",
                    "error": str(e),
                },
                message="数据库测试失败",
                code=500,
            )

    elif component_name == "redis":
        state_ok, cache_ok = await asyncio.gather(
            state_redis.ping(),
            query_cache.ping()
            if query_cache.enabled
            else asyncio.sleep(0, result=True),
        )
        passed = state_ok and cache_ok
        return success_response(
            data={
                "component": component_name,
                "test_result": "passed" if passed else "failed",
                "details": {
                    "state": "ok" if state_ok else "failed",
                    "query_cache": (
                        "disabled"
                        if not query_cache.enabled
                        else "ok"
                        if cache_ok
                        else "failed"
                    ),
                },
            },
            message="Redis测试通过" if passed else "Redis测试失败",
            code=200 if passed else 500,
        )

    else:
        raise HTTPException(
            status_code=404,
            detail=f"Test not available for component: {component_name}",
        )
