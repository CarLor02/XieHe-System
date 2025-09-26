"""
系统性能监控服务

提供API响应时间、数据库性能、系统资源监控功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import time
import psutil
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from collections import deque
import statistics

from app.core.database import get_db
from sqlalchemy import text

logger = logging.getLogger(__name__)


@dataclass
class PerformanceMetric:
    """性能指标数据类"""
    timestamp: datetime
    metric_type: str
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "metric_type": self.metric_type,
            "metric_name": self.metric_name,
            "value": self.value,
            "unit": self.unit,
            "tags": self.tags or {}
        }


class MetricsCollector:
    """指标收集器"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.metrics = deque(maxlen=max_size)
        self.api_response_times = deque(maxlen=max_size)
        self.db_query_times = deque(maxlen=max_size)
        self.system_metrics = deque(maxlen=max_size)
    
    def add_metric(self, metric: PerformanceMetric):
        """添加性能指标"""
        self.metrics.append(metric)
        
        # 按类型分类存储
        if metric.metric_type == "api_response":
            self.api_response_times.append(metric)
        elif metric.metric_type == "database":
            self.db_query_times.append(metric)
        elif metric.metric_type == "system":
            self.system_metrics.append(metric)
    
    def get_recent_metrics(self, metric_type: str = None, minutes: int = 60) -> List[PerformanceMetric]:
        """获取最近的指标"""
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        
        if metric_type:
            source = getattr(self, f"{metric_type}_times", self.metrics)
        else:
            source = self.metrics
        
        return [m for m in source if m.timestamp >= cutoff_time]
    
    def get_statistics(self, metric_type: str = None, minutes: int = 60) -> Dict[str, Any]:
        """获取统计信息"""
        recent_metrics = self.get_recent_metrics(metric_type, minutes)
        
        if not recent_metrics:
            return {}
        
        values = [m.value for m in recent_metrics]
        
        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": statistics.mean(values),
            "median": statistics.median(values),
            "p95": statistics.quantiles(values, n=20)[18] if len(values) >= 20 else max(values),
            "p99": statistics.quantiles(values, n=100)[98] if len(values) >= 100 else max(values)
        }


class MonitoringService:
    """监控服务类"""
    
    def __init__(self):
        self.collector = MetricsCollector()
        self.is_running = False
        self.collection_task = None
        self.collection_interval = 30  # 秒
        
        # 性能阈值配置
        self.thresholds = {
            "api_response_time": 2.0,  # 秒
            "db_query_time": 1.0,      # 秒
            "cpu_usage": 80.0,         # 百分比
            "memory_usage": 85.0,      # 百分比
            "disk_usage": 90.0         # 百分比
        }
    
    async def start(self):
        """启动监控服务"""
        if not self.is_running:
            self.is_running = True
            self.collection_task = asyncio.create_task(self._collect_system_metrics())
            logger.info("性能监控服务已启动")
    
    async def stop(self):
        """停止监控服务"""
        if self.is_running:
            self.is_running = False
            if self.collection_task:
                self.collection_task.cancel()
                try:
                    await self.collection_task
                except asyncio.CancelledError:
                    pass
            logger.info("性能监控服务已停止")
    
    async def record_api_response_time(
        self, 
        endpoint: str, 
        method: str, 
        response_time: float,
        status_code: int = 200
    ):
        """记录API响应时间"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_type="api_response",
            metric_name="response_time",
            value=response_time,
            unit="seconds",
            tags={
                "endpoint": endpoint,
                "method": method,
                "status_code": str(status_code)
            }
        )
        self.collector.add_metric(metric)
        
        # 检查是否超过阈值
        if response_time > self.thresholds["api_response_time"]:
            logger.warning(f"API响应时间过长: {endpoint} {method} - {response_time:.2f}s")
    
    async def record_db_query_time(
        self, 
        query_type: str, 
        table_name: str, 
        query_time: float
    ):
        """记录数据库查询时间"""
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_type="database",
            metric_name="query_time",
            value=query_time,
            unit="seconds",
            tags={
                "query_type": query_type,
                "table": table_name
            }
        )
        self.collector.add_metric(metric)
        
        # 检查是否超过阈值
        if query_time > self.thresholds["db_query_time"]:
            logger.warning(f"数据库查询时间过长: {table_name} {query_type} - {query_time:.2f}s")
    
    async def _collect_system_metrics(self):
        """收集系统指标"""
        while self.is_running:
            try:
                # CPU使用率
                cpu_percent = psutil.cpu_percent(interval=1)
                cpu_metric = PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_type="system",
                    metric_name="cpu_usage",
                    value=cpu_percent,
                    unit="percent"
                )
                self.collector.add_metric(cpu_metric)
                
                # 内存使用率
                memory = psutil.virtual_memory()
                memory_metric = PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_type="system",
                    metric_name="memory_usage",
                    value=memory.percent,
                    unit="percent"
                )
                self.collector.add_metric(memory_metric)
                
                # 磁盘使用率
                disk = psutil.disk_usage('/')
                disk_percent = (disk.used / disk.total) * 100
                disk_metric = PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_type="system",
                    metric_name="disk_usage",
                    value=disk_percent,
                    unit="percent"
                )
                self.collector.add_metric(disk_metric)
                
                # 网络IO
                net_io = psutil.net_io_counters()
                net_metric = PerformanceMetric(
                    timestamp=datetime.now(),
                    metric_type="system",
                    metric_name="network_io",
                    value=net_io.bytes_sent + net_io.bytes_recv,
                    unit="bytes"
                )
                self.collector.add_metric(net_metric)
                
                # 检查阈值告警
                await self._check_thresholds(cpu_percent, memory.percent, disk_percent)
                
                # 数据库连接数
                await self._collect_db_metrics()
                
                await asyncio.sleep(self.collection_interval)
                
            except Exception as e:
                logger.error(f"收集系统指标失败: {e}")
                await asyncio.sleep(5)
    
    async def _collect_db_metrics(self):
        """收集数据库指标"""
        try:
            db = next(get_db())
            
            # 活跃连接数
            result = db.execute(text("SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"))
            active_connections = result.scalar()
            
            conn_metric = PerformanceMetric(
                timestamp=datetime.now(),
                metric_type="database",
                metric_name="active_connections",
                value=active_connections,
                unit="count"
            )
            self.collector.add_metric(conn_metric)
            
            # 数据库大小
            result = db.execute(text("SELECT pg_database_size(current_database())"))
            db_size = result.scalar()
            
            size_metric = PerformanceMetric(
                timestamp=datetime.now(),
                metric_type="database",
                metric_name="database_size",
                value=db_size,
                unit="bytes"
            )
            self.collector.add_metric(size_metric)
            
        except Exception as e:
            logger.error(f"收集数据库指标失败: {e}")
        finally:
            if db:
                db.close()
    
    async def _check_thresholds(self, cpu_percent: float, memory_percent: float, disk_percent: float):
        """检查性能阈值"""
        alerts = []
        
        if cpu_percent > self.thresholds["cpu_usage"]:
            alerts.append(f"CPU使用率过高: {cpu_percent:.1f}%")
        
        if memory_percent > self.thresholds["memory_usage"]:
            alerts.append(f"内存使用率过高: {memory_percent:.1f}%")
        
        if disk_percent > self.thresholds["disk_usage"]:
            alerts.append(f"磁盘使用率过高: {disk_percent:.1f}%")
        
        for alert in alerts:
            logger.warning(alert)
    
    def get_current_status(self) -> Dict[str, Any]:
        """获取当前系统状态"""
        try:
            # 系统资源
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # API性能统计
            api_stats = self.collector.get_statistics("api_response", 60)
            
            # 数据库性能统计
            db_stats = self.collector.get_statistics("database", 60)
            
            return {
                "timestamp": datetime.now().isoformat(),
                "system": {
                    "cpu_usage": cpu_percent,
                    "memory_usage": memory.percent,
                    "memory_available": memory.available,
                    "disk_usage": (disk.used / disk.total) * 100,
                    "disk_free": disk.free
                },
                "api_performance": api_stats,
                "database_performance": db_stats,
                "thresholds": self.thresholds,
                "alerts": self._get_current_alerts()
            }
            
        except Exception as e:
            logger.error(f"获取系统状态失败: {e}")
            return {"error": str(e)}
    
    def _get_current_alerts(self) -> List[str]:
        """获取当前告警"""
        alerts = []
        
        try:
            cpu_percent = psutil.cpu_percent()
            memory_percent = psutil.virtual_memory().percent
            disk_percent = (psutil.disk_usage('/').used / psutil.disk_usage('/').total) * 100
            
            if cpu_percent > self.thresholds["cpu_usage"]:
                alerts.append(f"CPU使用率告警: {cpu_percent:.1f}%")
            
            if memory_percent > self.thresholds["memory_usage"]:
                alerts.append(f"内存使用率告警: {memory_percent:.1f}%")
            
            if disk_percent > self.thresholds["disk_usage"]:
                alerts.append(f"磁盘使用率告警: {disk_percent:.1f}%")
            
        except Exception as e:
            alerts.append(f"获取告警信息失败: {e}")
        
        return alerts
    
    def get_metrics_history(
        self, 
        metric_type: str = None, 
        hours: int = 24
    ) -> List[Dict[str, Any]]:
        """获取指标历史数据"""
        recent_metrics = self.collector.get_recent_metrics(metric_type, hours * 60)
        return [metric.to_dict() for metric in recent_metrics]
    
    def update_thresholds(self, new_thresholds: Dict[str, float]):
        """更新性能阈值"""
        self.thresholds.update(new_thresholds)
        logger.info(f"性能阈值已更新: {new_thresholds}")


# 创建全局监控服务实例
monitoring_service = MonitoringService()


# 性能监控装饰器
def monitor_performance(endpoint: str = None, query_type: str = None):
    """性能监控装饰器"""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                response_time = time.time() - start_time
                
                if endpoint:
                    await monitoring_service.record_api_response_time(
                        endpoint=endpoint,
                        method="POST",  # 默认方法
                        response_time=response_time
                    )
                elif query_type:
                    await monitoring_service.record_db_query_time(
                        query_type=query_type,
                        table_name="unknown",
                        query_time=response_time
                    )
                
                return result
            except Exception as e:
                response_time = time.time() - start_time
                if endpoint:
                    await monitoring_service.record_api_response_time(
                        endpoint=endpoint,
                        method="POST",
                        response_time=response_time,
                        status_code=500
                    )
                raise e
        
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                response_time = time.time() - start_time
                
                if query_type:
                    # 同步记录数据库查询时间
                    asyncio.create_task(monitoring_service.record_db_query_time(
                        query_type=query_type,
                        table_name="unknown",
                        query_time=response_time
                    ))
                
                return result
            except Exception as e:
                response_time = time.time() - start_time
                logger.error(f"监控的函数执行失败: {func.__name__} - {response_time:.2f}s - {e}")
                raise e
        
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator
