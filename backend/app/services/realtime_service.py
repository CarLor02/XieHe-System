"""
实时数据缓存刷新服务

提供实时数据推送功能，包括：
- 仪表板数据定时刷新
- 系统状态监控刷新
- 任务进度通知刷新
- 用户消息刷新

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import json
import os
import socket
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from uuid import uuid4

from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database.session import get_db
from app.core.system.cache import get_cache_manager
from app.core.system.logger import LogLevel, logger


REALTIME_LEADER_LOCK_KEY = "locks:medical_backend:realtime_service"
REALTIME_LEADER_LOCK_TTL_SECONDS = 45
REALTIME_LEADER_REFRESH_INTERVAL_SECONDS = 15
REALTIME_LEADER_TOKEN = f"{socket.gethostname()}:{os.getpid()}:{uuid4().hex}"


@dataclass
class RealtimeData:
    """实时数据结构"""
    type: str
    data: Dict[str, Any]
    timestamp: datetime
    channel: str
    priority: str = "normal"  # low, normal, high, urgent

class RealtimeDataService:
    """实时数据缓存刷新服务"""
    
    def __init__(self):
        self.cache_manager = get_cache_manager()
        self.is_running = False
        self.push_tasks = {}
        
    async def start_service(self):
        """启动实时数据推送服务"""
        if self.is_running:
            logger.emit_event(LogLevel.WARNING, message="实时数据推送服务已在运行")
            return
        
        self.is_running = True
        logger.emit_event(LogLevel.INFO, message="启动实时数据推送服务")
        
        # 启动各种数据推送任务
        self.push_tasks = {
            "dashboard": asyncio.create_task(self._push_dashboard_data()),
            "system_metrics": asyncio.create_task(self._push_system_metrics()),
            "notifications": asyncio.create_task(self._push_notifications()),
            "task_progress": asyncio.create_task(self._push_task_progress())
        }
        
        # 等待所有任务完成（通常不会完成，除非服务停止）
        try:
            await asyncio.gather(*self.push_tasks.values())
        except asyncio.CancelledError:
            logger.emit_event(LogLevel.INFO, message="实时数据推送任务已取消")
    
    async def stop_service(self):
        """停止实时数据推送服务"""
        if not self.is_running:
            return
        
        self.is_running = False
        logger.emit_event(LogLevel.INFO, message="停止实时数据推送服务")
        
        # 取消所有推送任务
        for task_name, task in self.push_tasks.items():
            if not task.done():
                task.cancel()
                logger.emit_event(LogLevel.INFO, message=f"取消推送任务: {task_name}")
        
        # 等待任务完成取消
        await asyncio.gather(*self.push_tasks.values(), return_exceptions=True)
        self.push_tasks.clear()
    
    async def _push_dashboard_data(self):
        """推送仪表板数据"""
        while self.is_running:
            try:
                # 获取仪表板数据
                dashboard_data = await self._get_dashboard_data()
                
                # 创建实时数据对象
                realtime_data = RealtimeData(
                    type="dashboard_update",
                    data=dashboard_data,
                    timestamp=datetime.now(),
                    channel="dashboard"
                )
                
                # 推送数据
                await self._broadcast_data(realtime_data)
                
                # 等待30秒后再次推送
                await asyncio.sleep(30)
                
            except Exception as e:
                logger.emit_event(LogLevel.ERROR, message=f"推送仪表板数据失败: {e}")
                await asyncio.sleep(10)  # 错误时等待较短时间
    
    async def _push_system_metrics(self):
        """推送系统指标数据"""
        while self.is_running:
            try:
                # 获取系统指标
                metrics_data = await self._get_system_metrics()
                
                realtime_data = RealtimeData(
                    type="system_metrics",
                    data=metrics_data,
                    timestamp=datetime.now(),
                    channel="system_metrics"
                )
                
                await self._broadcast_data(realtime_data)
                
                # 每15秒推送一次系统指标
                await asyncio.sleep(15)
                
            except Exception as e:
                logger.emit_event(LogLevel.ERROR, message=f"推送系统指标失败: {e}")
                await asyncio.sleep(10)
    
    async def _push_notifications(self):
        """推送通知消息"""
        while self.is_running:
            try:
                # 获取新通知
                notifications = await self._get_new_notifications()
                
                if notifications:
                    for notification in notifications:
                        realtime_data = RealtimeData(
                            type="notification",
                            data=notification,
                            timestamp=datetime.now(),
                            channel="notifications",
                            priority="high"
                        )
                        
                        await self._broadcast_data(realtime_data)
                
                # 每5秒检查一次新通知
                await asyncio.sleep(5)
                
            except Exception as e:
                logger.emit_event(LogLevel.ERROR, message=f"推送通知失败: {e}")
                await asyncio.sleep(10)
    
    async def _push_task_progress(self):
        """推送任务进度"""
        while self.is_running:
            try:
                # 获取进行中的任务进度
                task_progress = await self._get_task_progress()
                
                if task_progress:
                    for progress in task_progress:
                        realtime_data = RealtimeData(
                            type="task_progress",
                            data=progress,
                            timestamp=datetime.now(),
                            channel="task_progress"
                        )
                        
                        await self._broadcast_data(realtime_data)
                
                # 每10秒检查一次任务进度
                await asyncio.sleep(10)
                
            except Exception as e:
                logger.emit_event(LogLevel.ERROR, message=f"推送任务进度失败: {e}")
                await asyncio.sleep(10)
    
    async def _get_dashboard_data(self) -> Dict[str, Any]:
        """获取仪表板数据"""
        # 这里应该从数据库获取实际数据，现在使用模拟数据
        return {
            "overview": {
                "total_reports": 1247 + (datetime.now().second % 10),  # 模拟数据变化
                "pending_reports": 98 + (datetime.now().second % 5),
                "completed_reports": 1089 + (datetime.now().second % 3),
                "overdue_reports": 15,
                "total_patients": 2456,
                "new_patients_today": 23,
                "active_users": 45,
                "system_alerts": 3
            },
            "recent_activities": [
                {
                    "id": f"activity_{datetime.now().timestamp()}",
                    "type": "report_completed",
                    "message": "张医生完成了患者李某的CT报告",
                    "timestamp": datetime.now().isoformat()
                }
            ]
        }
    
    async def _get_system_metrics(self) -> Dict[str, Any]:
        """获取系统指标"""
        import psutil
        import random
        
        try:
            # 获取真实的系统指标
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "cpu_usage": cpu_percent,
                "memory_usage": memory.percent,
                "disk_usage": (disk.used / disk.total) * 100,
                "network_io": {
                    "bytes_sent": random.randint(1000000, 5000000),
                    "bytes_recv": random.randint(1000000, 5000000)
                },
                "database_connections": random.randint(10, 50),
                "active_sessions": random.randint(20, 100),
                "api_response_time": round(random.uniform(0.1, 2.0), 2),
                "error_rate": round(random.uniform(0.0, 5.0), 2),
                "uptime": str(datetime.now() - datetime(2025, 9, 24))
            }
        except Exception as e:
            logger.emit_event(LogLevel.ERROR, message=f"获取系统指标失败: {e}")
            # 返回模拟数据
            return {
                "cpu_usage": random.uniform(20, 80),
                "memory_usage": random.uniform(40, 90),
                "disk_usage": random.uniform(10, 60),
                "network_io": {
                    "bytes_sent": random.randint(1000000, 5000000),
                    "bytes_recv": random.randint(1000000, 5000000)
                },
                "database_connections": random.randint(10, 50),
                "active_sessions": random.randint(20, 100),
                "api_response_time": round(random.uniform(0.1, 2.0), 2),
                "error_rate": round(random.uniform(0.0, 5.0), 2),
                "uptime": "1 day, 2:30:45"
            }
    
    async def _get_new_notifications(self) -> List[Dict[str, Any]]:
        """获取新通知"""
        # 模拟新通知检查
        import random
        
        if random.random() < 0.1:  # 10%概率有新通知
            return [{
                "id": f"notif_{datetime.now().timestamp()}",
                "title": "新报告待审核",
                "message": "有新的影像报告需要您的审核",
                "type": "info",
                "priority": "normal",
                "created_at": datetime.now().isoformat(),
                "read": False
            }]
        
        return []
    
    async def _get_task_progress(self) -> List[Dict[str, Any]]:
        """获取任务进度"""
        # 模拟任务进度
        import random
        
        if random.random() < 0.2:  # 20%概率有任务进度更新
            return [{
                "task_id": f"task_{datetime.now().timestamp()}",
                "name": "AI模型推理",
                "progress": random.randint(10, 90),
                "status": "processing",
                "estimated_completion": (datetime.now() + timedelta(minutes=5)).isoformat()
            }]
        
        return []
    
    async def _broadcast_data(self, data: RealtimeData):
        """写入最新实时数据缓存"""
        logger.emit_event(LogLevel.INFO, message=f"广播数据到频道 {data.channel}: {data.type}")
        
        # 将最新数据存储到缓存中，供 HTTP 查询接口或后台任务复用
        cache_key = f"realtime_data:{data.channel}:latest"
        cache_data = {
            "type": data.type,
            "data": data.data,
            "timestamp": data.timestamp.isoformat(),
            "channel": data.channel,
            "priority": data.priority
        }
        
        self.cache_manager.set(
            cache_key,
            json.dumps(cache_data, default=str),
            ttl=300  # 5分钟过期
        )
    
    async def send_user_notification(self, user_id: str, notification: Dict[str, Any]):
        """发送用户通知"""
        realtime_data = RealtimeData(
            type="user_notification",
            data=notification,
            timestamp=datetime.now(),
            channel=f"user_{user_id}",
            priority="high"
        )
        
        await self._broadcast_data(realtime_data)
        logger.emit_event(LogLevel.INFO, message=f"发送用户通知: {user_id}")
    
    async def send_system_alert(self, alert: Dict[str, Any]):
        """发送系统警报"""
        realtime_data = RealtimeData(
            type="system_alert",
            data=alert,
            timestamp=datetime.now(),
            channel="system_alerts",
            priority="urgent"
        )
        
        await self._broadcast_data(realtime_data)
        logger.emit_event(LogLevel.WARNING, message=f"发送系统警报: {alert.get('message', 'Unknown alert')}")

# 全局实时数据服务实例（延迟初始化）
realtime_service = None
_realtime_leader_refresh_task: Optional[asyncio.Task] = None


def _normalize_lock_value(value: Any) -> str:
    """Normalize Redis lock values returned as bytes or strings."""
    if isinstance(value, bytes):
        return value.decode()
    return str(value) if value is not None else ""


def _try_acquire_realtime_leader() -> bool:
    """Acquire the cross-worker realtime leader lock in Redis."""
    try:
        redis_client = get_cache_manager().redis_client
        return bool(
            redis_client.set(
                REALTIME_LEADER_LOCK_KEY,
                REALTIME_LEADER_TOKEN,
                nx=True,
                ex=REALTIME_LEADER_LOCK_TTL_SECONDS,
            )
        )
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"获取实时推送 leader 锁失败: {exc}")
        return False


def _release_realtime_leader() -> None:
    """Release the realtime leader lock only when this process still owns it."""
    try:
        redis_client = get_cache_manager().redis_client
        if _normalize_lock_value(redis_client.get(REALTIME_LEADER_LOCK_KEY)) == REALTIME_LEADER_TOKEN:
            redis_client.delete(REALTIME_LEADER_LOCK_KEY)
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"释放实时推送 leader 锁失败: {exc}")


async def _refresh_realtime_leader() -> None:
    """Keep the realtime leader lock alive while this worker owns background loops."""
    while True:
        await asyncio.sleep(REALTIME_LEADER_REFRESH_INTERVAL_SECONDS)
        try:
            redis_client = get_cache_manager().redis_client
            if _normalize_lock_value(redis_client.get(REALTIME_LEADER_LOCK_KEY)) != REALTIME_LEADER_TOKEN:
                logger.emit_event(LogLevel.WARNING, message="实时推送 leader 锁已丢失，停止当前 worker 的推送任务")
                if realtime_service is not None:
                    await realtime_service.stop_service()
                return
            redis_client.expire(REALTIME_LEADER_LOCK_KEY, REALTIME_LEADER_LOCK_TTL_SECONDS)
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.emit_event(LogLevel.ERROR, message=f"刷新实时推送 leader 锁失败: {exc}")


def _start_realtime_leader_refresh() -> None:
    """Start a local task that refreshes the Redis leader lock."""
    global _realtime_leader_refresh_task
    if _realtime_leader_refresh_task is None or _realtime_leader_refresh_task.done():
        _realtime_leader_refresh_task = asyncio.create_task(_refresh_realtime_leader())


async def _stop_realtime_leader_refresh() -> None:
    """Stop the local leader-lock refresh task."""
    global _realtime_leader_refresh_task
    if _realtime_leader_refresh_task is None:
        return
    task = _realtime_leader_refresh_task
    _realtime_leader_refresh_task = None
    if not task.done():
        task.cancel()
        await asyncio.gather(task, return_exceptions=True)

async def start_realtime_service():
    """启动实时数据推送服务"""
    global realtime_service
    if not _try_acquire_realtime_leader():
        logger.emit_event(LogLevel.INFO, message="实时数据推送服务已由其他 worker 运行，当前 worker 跳过启动")
        return

    _start_realtime_leader_refresh()
    if realtime_service is None:
        realtime_service = RealtimeDataService()
    try:
        await realtime_service.start_service()
    finally:
        await _stop_realtime_leader_refresh()
        _release_realtime_leader()

async def stop_realtime_service():
    """停止实时数据推送服务"""
    global realtime_service
    if realtime_service is not None:
        await realtime_service.stop_service()

def get_realtime_service() -> RealtimeDataService:
    """获取实时数据服务实例"""
    return realtime_service
