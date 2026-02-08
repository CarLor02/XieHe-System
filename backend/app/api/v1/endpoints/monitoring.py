"""
系统监控API端点

提供系统性能监控、指标查询和告警管理功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.auth import get_current_active_user
from app.core.response import success_response, paginated_response
from app.models.user import User
from app.services.monitoring_service import monitoring_service

router = APIRouter()


# 请求模型
class ThresholdUpdate(BaseModel):
    api_response_time: Optional[float] = None
    db_query_time: Optional[float] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None


class MetricQuery(BaseModel):
    metric_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 1000


# 响应模型
class SystemStatus(BaseModel):
    timestamp: str
    system: Dict[str, Any]
    api_performance: Dict[str, Any]
    database_performance: Dict[str, Any]
    thresholds: Dict[str, float]
    alerts: List[str]


class MetricPoint(BaseModel):
    timestamp: str
    metric_type: str
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str]


@router.get("/status", response_model=Dict[str, Any])
async def get_system_status(
    current_user: dict = Depends(get_current_active_user)
):
    """获取系统当前状态"""
    try:
        status = monitoring_service.get_current_status()
        return success_response(data=status, message="获取系统状态成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取系统状态失败: {str(e)}")


@router.get("/metrics", response_model=Dict[str, Any])
async def get_metrics(
    metric_type: Optional[str] = Query(None, description="指标类型: api_response, database, system"),
    hours: int = Query(24, ge=1, le=168, description="查询时间范围(小时)"),
    current_user: dict = Depends(get_current_active_user)
):
    """获取性能指标历史数据"""
    try:
        metrics = monitoring_service.get_metrics_history(metric_type, hours)
        return success_response(data=metrics, message="获取指标数据成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取指标数据失败: {str(e)}")


@router.get("/metrics/statistics", response_model=Dict[str, Any])
async def get_metrics_statistics(
    metric_type: Optional[str] = Query(None, description="指标类型"),
    minutes: int = Query(60, ge=1, le=1440, description="统计时间范围(分钟)"),
    current_user: dict = Depends(get_current_active_user)
):
    """获取指标统计信息"""
    try:
        stats = monitoring_service.collector.get_statistics(metric_type, minutes)
        data = {
            "metric_type": metric_type or "all",
            "time_range_minutes": minutes,
            "statistics": stats
        }
        return success_response(data=data, message="获取统计信息成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计信息失败: {str(e)}")


@router.get("/alerts", response_model=Dict[str, Any])
async def get_current_alerts(
    current_user: dict = Depends(get_current_active_user)
):
    """获取当前告警信息"""
    try:
        alerts = monitoring_service._get_current_alerts()
        data = {
            "timestamp": datetime.now().isoformat(),
            "alert_count": len(alerts),
            "alerts": alerts
        }
        return success_response(data=data, message="获取告警信息成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取告警信息失败: {str(e)}")


@router.put("/thresholds", response_model=Dict[str, Any])
async def update_thresholds(
    thresholds: ThresholdUpdate,
    current_user: dict = Depends(get_current_active_user)
):
    """更新性能阈值"""
    try:
        # 只更新非空值
        new_thresholds = {}
        if thresholds.api_response_time is not None:
            new_thresholds["api_response_time"] = thresholds.api_response_time
        if thresholds.db_query_time is not None:
            new_thresholds["db_query_time"] = thresholds.db_query_time
        if thresholds.cpu_usage is not None:
            new_thresholds["cpu_usage"] = thresholds.cpu_usage
        if thresholds.memory_usage is not None:
            new_thresholds["memory_usage"] = thresholds.memory_usage
        if thresholds.disk_usage is not None:
            new_thresholds["disk_usage"] = thresholds.disk_usage

        if not new_thresholds:
            raise HTTPException(status_code=400, detail="至少需要提供一个阈值")

        monitoring_service.update_thresholds(new_thresholds)

        data = {
            "updated_thresholds": new_thresholds,
            "current_thresholds": monitoring_service.thresholds
        }
        return success_response(data=data, message="阈值更新成功")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新阈值失败: {str(e)}")


@router.get("/thresholds", response_model=Dict[str, Any])
async def get_thresholds(
    current_user: dict = Depends(get_current_active_user)
):
    """获取当前性能阈值"""
    data = {
        "thresholds": monitoring_service.thresholds,
        "description": {
            "api_response_time": "API响应时间阈值(秒)",
            "db_query_time": "数据库查询时间阈值(秒)",
            "cpu_usage": "CPU使用率阈值(%)",
            "memory_usage": "内存使用率阈值(%)",
            "disk_usage": "磁盘使用率阈值(%)"
        }
    }
    return success_response(data=data, message="获取阈值成功")


@router.get("/health", response_model=Dict[str, Any])
async def health_check():
    """健康检查端点"""
    try:
        status = monitoring_service.get_current_status()

        # 检查关键指标
        system = status.get("system", {})
        alerts = status.get("alerts", [])

        is_healthy = (
            system.get("cpu_usage", 0) < 90 and
            system.get("memory_usage", 0) < 95 and
            system.get("disk_usage", 0) < 95 and
            len(alerts) == 0
        )

        data = {
            "status": "healthy" if is_healthy else "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "checks": {
                "cpu": system.get("cpu_usage", 0) < 90,
                "memory": system.get("memory_usage", 0) < 95,
                "disk": system.get("disk_usage", 0) < 95,
                "alerts": len(alerts) == 0
            },
            "metrics": {
                "cpu_usage": system.get("cpu_usage", 0),
                "memory_usage": system.get("memory_usage", 0),
                "disk_usage": system.get("disk_usage", 0),
                "alert_count": len(alerts)
            }
        }
        return success_response(data=data, message="健康检查完成")
    except Exception as e:
        data = {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
        return success_response(data=data, message="健康检查失败")


@router.get("/performance/api", response_model=Dict[str, Any])
async def get_api_performance(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(get_current_active_user)
):
    """获取API性能统计"""
    try:
        # 获取API响应时间指标
        api_metrics = monitoring_service.collector.get_recent_metrics("api_response", hours * 60)

        if not api_metrics:
            data = {
                "message": "暂无API性能数据",
                "time_range_hours": hours,
                "metrics": []
            }
            return success_response(data=data, message="暂无API性能数据")

        # 按端点分组统计
        endpoint_stats = {}
        for metric in api_metrics:
            endpoint = metric.tags.get("endpoint", "unknown")
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = []
            endpoint_stats[endpoint].append(metric.value)

        # 计算每个端点的统计信息
        performance_data = []
        for endpoint, response_times in endpoint_stats.items():
            if response_times:
                import statistics
                performance_data.append({
                    "endpoint": endpoint,
                    "request_count": len(response_times),
                    "avg_response_time": statistics.mean(response_times),
                    "min_response_time": min(response_times),
                    "max_response_time": max(response_times),
                    "p95_response_time": statistics.quantiles(response_times, n=20)[18] if len(response_times) >= 20 else max(response_times)
                })

        # 按平均响应时间排序
        performance_data.sort(key=lambda x: x["avg_response_time"], reverse=True)

        data = {
            "time_range_hours": hours,
            "total_requests": len(api_metrics),
            "unique_endpoints": len(endpoint_stats),
            "performance_data": performance_data
        }
        return success_response(data=data, message="获取API性能数据成功")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取API性能数据失败: {str(e)}")


@router.get("/performance/database", response_model=Dict[str, Any])
async def get_database_performance(
    hours: int = Query(24, ge=1, le=168),
    current_user: dict = Depends(get_current_active_user)
):
    """获取数据库性能统计"""
    try:
        # 获取数据库指标
        db_metrics = monitoring_service.collector.get_recent_metrics("database", hours * 60)

        if not db_metrics:
            data = {
                "message": "暂无数据库性能数据",
                "time_range_hours": hours,
                "metrics": []
            }
            return success_response(data=data, message="暂无数据库性能数据")

        # 分类统计
        query_times = []
        connections = []
        db_sizes = []

        for metric in db_metrics:
            if metric.metric_name == "query_time":
                query_times.append(metric.value)
            elif metric.metric_name == "active_connections":
                connections.append(metric.value)
            elif metric.metric_name == "database_size":
                db_sizes.append(metric.value)

        import statistics

        result = {
            "time_range_hours": hours,
            "total_metrics": len(db_metrics)
        }

        if query_times:
            result["query_performance"] = {
                "total_queries": len(query_times),
                "avg_query_time": statistics.mean(query_times),
                "min_query_time": min(query_times),
                "max_query_time": max(query_times),
                "p95_query_time": statistics.quantiles(query_times, n=20)[18] if len(query_times) >= 20 else max(query_times)
            }

        if connections:
            result["connection_stats"] = {
                "avg_connections": statistics.mean(connections),
                "max_connections": max(connections),
                "min_connections": min(connections)
            }

        if db_sizes:
            result["database_size"] = {
                "current_size_bytes": db_sizes[-1] if db_sizes else 0,
                "current_size_mb": (db_sizes[-1] / 1024 / 1024) if db_sizes else 0
            }

        return success_response(data=result, message="获取数据库性能数据成功")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取数据库性能数据失败: {str(e)}")


@router.post("/test/api-performance", response_model=Dict[str, Any])
async def test_api_performance(
    current_user: dict = Depends(get_current_active_user)
):
    """测试API性能记录"""
    import time
    import random

    # 模拟一些API调用
    test_endpoints = [
        "/api/v1/patients",
        "/api/v1/images",
        "/api/v1/reports",
        "/api/v1/users"
    ]

    for endpoint in test_endpoints:
        # 模拟不同的响应时间
        response_time = random.uniform(0.1, 2.5)
        await monitoring_service.record_api_response_time(
            endpoint=endpoint,
            method="GET",
            response_time=response_time,
            status_code=200
        )

    data = {
        "test_endpoints": test_endpoints
    }
    return success_response(data=data, message="API性能测试数据已生成")
