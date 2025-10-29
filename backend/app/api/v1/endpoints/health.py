"""
健康检查接口

提供各组件状态监控和系统健康检查功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import time
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import psutil
from redis import asyncio as aioredis
from sqlalchemy import text

from app.core.database import get_db
from app.core.config import settings

router = APIRouter()


class HealthStatus(BaseModel):
    status: str
    timestamp: str
    uptime: float
    version: str
    environment: str


class ComponentHealth(BaseModel):
    name: str
    status: str
    response_time: float
    details: Dict[str, Any]
    last_check: str


class SystemHealth(BaseModel):
    overall_status: str
    timestamp: str
    components: List[ComponentHealth]
    system_info: Dict[str, Any]


async def check_database_health() -> ComponentHealth:
    """检查数据库健康状态"""
    start_time = time.time()
    try:
        db = next(get_db())
        result = db.execute(text("SELECT 1")).fetchone()
        response_time = time.time() - start_time
        
        if result:
            return ComponentHealth(
                name="database",
                status="healthy",
                response_time=response_time * 1000,
                details={
                    "connection_pool": "active",
                    "query_test": "passed"
                },
                last_check=datetime.now().isoformat()
            )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="database",
            status="unhealthy",
            response_time=response_time * 1000,
            details={
                "error": str(e),
                "connection_pool": "failed"
            },
            last_check=datetime.now().isoformat()
        )


async def check_redis_health() -> ComponentHealth:
    """检查Redis健康状态"""
    start_time = time.time()
    try:
        redis = aioredis.from_url(settings.REDIS_URL)
        await redis.ping()
        response_time = time.time() - start_time
        await redis.close()
        
        return ComponentHealth(
            name="redis",
            status="healthy",
            response_time=response_time * 1000,
            details={
                "connection": "active",
                "ping_test": "passed"
            },
            last_check=datetime.now().isoformat()
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="redis",
            status="unhealthy",
            response_time=response_time * 1000,
            details={
                "error": str(e),
                "connection": "failed"
            },
            last_check=datetime.now().isoformat()
        )


async def check_file_system_health() -> ComponentHealth:
    """检查文件系统健康状态"""
    start_time = time.time()
    try:
        # 检查磁盘使用率
        disk_usage = psutil.disk_usage('/')
        disk_percent = (disk_usage.used / disk_usage.total) * 100
        
        # 检查上传目录
        upload_dir = "uploads"
        import os
        upload_accessible = os.path.exists(upload_dir) and os.access(upload_dir, os.W_OK)
        
        response_time = time.time() - start_time
        
        status = "healthy" if disk_percent < 90 and upload_accessible else "warning"
        
        return ComponentHealth(
            name="filesystem",
            status=status,
            response_time=response_time * 1000,
            details={
                "disk_usage_percent": round(disk_percent, 2),
                "upload_directory": "accessible" if upload_accessible else "inaccessible",
                "free_space_gb": round(disk_usage.free / (1024**3), 2)
            },
            last_check=datetime.now().isoformat()
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="filesystem",
            status="unhealthy",
            response_time=response_time * 1000,
            details={
                "error": str(e)
            },
            last_check=datetime.now().isoformat()
        )


async def check_memory_health() -> ComponentHealth:
    """检查内存健康状态"""
    start_time = time.time()
    try:
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        response_time = time.time() - start_time
        
        status = "healthy" if memory_percent < 85 else "warning" if memory_percent < 95 else "critical"
        
        return ComponentHealth(
            name="memory",
            status=status,
            response_time=response_time * 1000,
            details={
                "usage_percent": memory_percent,
                "available_gb": round(memory.available / (1024**3), 2),
                "total_gb": round(memory.total / (1024**3), 2)
            },
            last_check=datetime.now().isoformat()
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="memory",
            status="unhealthy",
            response_time=response_time * 1000,
            details={
                "error": str(e)
            },
            last_check=datetime.now().isoformat()
        )


async def check_cpu_health() -> ComponentHealth:
    """检查CPU健康状态"""
    start_time = time.time()
    try:
        # 获取CPU使用率（1秒采样）
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        response_time = time.time() - start_time
        
        status = "healthy" if cpu_percent < 80 else "warning" if cpu_percent < 95 else "critical"
        
        return ComponentHealth(
            name="cpu",
            status=status,
            response_time=response_time * 1000,
            details={
                "usage_percent": cpu_percent,
                "cpu_count": cpu_count,
                "load_average": list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else None
            },
            last_check=datetime.now().isoformat()
        )
    except Exception as e:
        response_time = time.time() - start_time
        return ComponentHealth(
            name="cpu",
            status="unhealthy",
            response_time=response_time * 1000,
            details={
                "error": str(e)
            },
            last_check=datetime.now().isoformat()
        )


@router.get("/", response_model=HealthStatus)
async def basic_health_check():
    """基础健康检查"""
    import app
    
    return HealthStatus(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        uptime=time.time() - getattr(app, 'start_time', time.time()),
        version=getattr(settings, 'VERSION', '1.0.0'),
        environment=getattr(settings, 'ENVIRONMENT', 'development')
    )


@router.get("/detailed", response_model=SystemHealth)
async def detailed_health_check():
    """详细健康检查"""
    # 并行检查所有组件
    components = await asyncio.gather(
        check_database_health(),
        check_redis_health(),
        check_file_system_health(),
        check_memory_health(),
        check_cpu_health(),
        return_exceptions=True
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
        "process_count": len(psutil.pids())
    }
    
    return SystemHealth(
        overall_status=overall_status,
        timestamp=datetime.now().isoformat(),
        components=valid_components,
        system_info=system_info
    )


@router.get("/component/{component_name}")
async def check_component_health(component_name: str):
    """检查特定组件健康状态"""
    component_checkers = {
        "database": check_database_health,
        "redis": check_redis_health,
        "filesystem": check_file_system_health,
        "memory": check_memory_health,
        "cpu": check_cpu_health
    }
    
    if component_name not in component_checkers:
        raise HTTPException(
            status_code=404, 
            detail=f"Component '{component_name}' not found. Available: {list(component_checkers.keys())}"
        )
    
    component_health = await component_checkers[component_name]()
    return component_health


@router.get("/readiness")
async def readiness_check():
    """就绪检查 - 检查应用是否准备好接收流量"""
    try:
        # 检查关键组件
        db_health = await check_database_health()
        
        if db_health.status == "unhealthy":
            raise HTTPException(status_code=503, detail="Database not ready")
        
        return {
            "status": "ready",
            "timestamp": datetime.now().isoformat(),
            "message": "Application is ready to serve traffic"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Application not ready: {str(e)}")


@router.get("/liveness")
async def liveness_check():
    """存活检查 - 检查应用是否还活着"""
    return {
        "status": "alive",
        "timestamp": datetime.now().isoformat(),
        "message": "Application is alive"
    }


@router.get("/metrics")
async def health_metrics():
    """健康检查指标"""
    try:
        # 获取系统指标
        cpu_percent = psutil.cpu_percent()
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # 网络统计
        network = psutil.net_io_counters()
        
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "usage_percent": cpu_percent,
                "count": psutil.cpu_count()
            },
            "memory": {
                "usage_percent": memory.percent,
                "available_bytes": memory.available,
                "total_bytes": memory.total
            },
            "disk": {
                "usage_percent": (disk.used / disk.total) * 100,
                "free_bytes": disk.free,
                "total_bytes": disk.total
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get metrics: {str(e)}")


@router.post("/test/{component_name}")
async def test_component(component_name: str):
    """测试特定组件功能"""
    if component_name == "database":
        try:
            db = next(get_db())
            # 执行一个简单的查询测试
            result = db.execute(text("SELECT COUNT(*) FROM users")).fetchone()
            return {
                "component": component_name,
                "test_result": "passed",
                "details": {"user_count": result[0] if result else 0}
            }
        except Exception as e:
            return {
                "component": component_name,
                "test_result": "failed",
                "error": str(e)
            }
    
    elif component_name == "redis":
        try:
            redis = aioredis.from_url(settings.REDIS_URL)
            # 测试写入和读取
            await redis.set("health_test", "ok", ex=60)
            value = await redis.get("health_test")
            await redis.delete("health_test")
            await redis.close()
            
            return {
                "component": component_name,
                "test_result": "passed" if value == b"ok" else "failed",
                "details": {"read_write_test": "ok"}
            }
        except Exception as e:
            return {
                "component": component_name,
                "test_result": "failed",
                "error": str(e)
            }
    
    else:
        raise HTTPException(status_code=404, detail=f"Test not available for component: {component_name}")
