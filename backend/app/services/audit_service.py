"""
操作日志审计服务

提供用户操作记录、数据变更追踪和审计日志功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import json
import asyncio
from datetime import datetime, timedelta
from typing import Dict, Any, Optional, List
from enum import Enum
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging

from app.core.database import get_db
from app.models.user import User

logger = logging.getLogger(__name__)


class AuditAction(str, Enum):
    """审计操作类型"""
    CREATE = "create"
    READ = "read"
    UPDATE = "update"
    DELETE = "delete"
    LOGIN = "login"
    LOGOUT = "logout"
    UPLOAD = "upload"
    DOWNLOAD = "download"
    EXPORT = "export"
    IMPORT = "import"
    APPROVE = "approve"
    REJECT = "reject"
    ASSIGN = "assign"
    UNASSIGN = "unassign"


class AuditLevel(str, Enum):
    """审计级别"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AuditResource(str, Enum):
    """审计资源类型"""
    USER = "user"
    PATIENT = "patient"
    IMAGE = "image"
    REPORT = "report"
    MODEL = "model"
    SYSTEM = "system"
    PERMISSION = "permission"
    ROLE = "role"
    FILE = "file"
    DATABASE = "database"


class AuditLog:
    """审计日志数据类"""
    
    def __init__(
        self,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        action: AuditAction = AuditAction.READ,
        resource: AuditResource = AuditResource.SYSTEM,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        level: AuditLevel = AuditLevel.LOW,
        description: str = "",
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None,
        timestamp: Optional[datetime] = None
    ):
        self.user_id = user_id
        self.username = username
        self.action = action
        self.resource = resource
        self.resource_id = resource_id
        self.resource_name = resource_name
        self.level = level
        self.description = description
        self.details = details or {}
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.session_id = session_id
        self.timestamp = timestamp or datetime.now()
    
    def to_dict(self) -> Dict[str, Any]:
        """转换为字典格式"""
        return {
            "user_id": self.user_id,
            "username": self.username,
            "action": self.action.value,
            "resource": self.resource.value,
            "resource_id": self.resource_id,
            "resource_name": self.resource_name,
            "level": self.level.value,
            "description": self.description,
            "details": json.dumps(self.details, ensure_ascii=False),
            "ip_address": self.ip_address,
            "user_agent": self.user_agent,
            "session_id": self.session_id,
            "timestamp": self.timestamp.isoformat()
        }


class AuditService:
    """审计服务类"""
    
    def __init__(self):
        self.log_queue = asyncio.Queue()
        self.batch_size = 100
        self.flush_interval = 30  # 秒
        self._running = False
        self._task = None
    
    async def start(self):
        """启动审计服务"""
        if not self._running:
            self._running = True
            self._task = asyncio.create_task(self._process_logs())
            logger.info("审计服务已启动")
    
    async def stop(self):
        """停止审计服务"""
        if self._running:
            self._running = False
            if self._task:
                self._task.cancel()
                try:
                    await self._task
                except asyncio.CancelledError:
                    pass
            logger.info("审计服务已停止")
    
    async def log(self, audit_log: AuditLog):
        """记录审计日志"""
        try:
            await self.log_queue.put(audit_log)
        except Exception as e:
            logger.error(f"添加审计日志到队列失败: {e}")
    
    async def log_action(
        self,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        action: AuditAction = AuditAction.READ,
        resource: AuditResource = AuditResource.SYSTEM,
        resource_id: Optional[str] = None,
        resource_name: Optional[str] = None,
        level: AuditLevel = AuditLevel.LOW,
        description: str = "",
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ):
        """便捷的日志记录方法"""
        audit_log = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            resource=resource,
            resource_id=resource_id,
            resource_name=resource_name,
            level=level,
            description=description,
            details=details,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
        await self.log(audit_log)
    
    async def _process_logs(self):
        """处理日志队列"""
        batch = []
        last_flush = datetime.now()
        
        while self._running:
            try:
                # 等待日志或超时
                try:
                    audit_log = await asyncio.wait_for(
                        self.log_queue.get(), 
                        timeout=1.0
                    )
                    batch.append(audit_log)
                except asyncio.TimeoutError:
                    pass
                
                # 检查是否需要刷新
                now = datetime.now()
                should_flush = (
                    len(batch) >= self.batch_size or
                    (batch and (now - last_flush).seconds >= self.flush_interval)
                )
                
                if should_flush and batch:
                    await self._flush_batch(batch)
                    batch.clear()
                    last_flush = now
                    
            except Exception as e:
                logger.error(f"处理审计日志失败: {e}")
                await asyncio.sleep(1)
    
    async def _flush_batch(self, batch: List[AuditLog]):
        """批量写入日志到数据库"""
        if not batch:
            return
        
        try:
            # 这里简化处理，实际应该写入专门的审计日志表
            db = next(get_db())
            
            # 创建审计日志表（如果不存在）
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                username VARCHAR(100),
                action VARCHAR(50) NOT NULL,
                resource VARCHAR(50) NOT NULL,
                resource_id VARCHAR(100),
                resource_name VARCHAR(200),
                level VARCHAR(20) NOT NULL,
                description TEXT,
                details JSONB,
                ip_address INET,
                user_agent TEXT,
                session_id VARCHAR(100),
                timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
            """
            db.execute(text(create_table_sql))
            
            # 批量插入日志
            insert_sql = """
            INSERT INTO audit_logs (
                user_id, username, action, resource, resource_id, resource_name,
                level, description, details, ip_address, user_agent, session_id, timestamp
            ) VALUES (
                :user_id, :username, :action, :resource, :resource_id, :resource_name,
                :level, :description, :details::jsonb, :ip_address, :user_agent, :session_id, :timestamp
            )
            """
            
            for audit_log in batch:
                db.execute(text(insert_sql), audit_log.to_dict())
            
            db.commit()
            logger.info(f"成功写入 {len(batch)} 条审计日志")
            
        except Exception as e:
            logger.error(f"批量写入审计日志失败: {e}")
            if db:
                db.rollback()
        finally:
            if db:
                db.close()
    
    async def query_logs(
        self,
        user_id: Optional[int] = None,
        username: Optional[str] = None,
        action: Optional[AuditAction] = None,
        resource: Optional[AuditResource] = None,
        level: Optional[AuditLevel] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """查询审计日志"""
        try:
            db = next(get_db())
            
            # 构建查询条件
            conditions = []
            params = {}
            
            if user_id:
                conditions.append("user_id = :user_id")
                params["user_id"] = user_id
            
            if username:
                conditions.append("username ILIKE :username")
                params["username"] = f"%{username}%"
            
            if action:
                conditions.append("action = :action")
                params["action"] = action.value
            
            if resource:
                conditions.append("resource = :resource")
                params["resource"] = resource.value
            
            if level:
                conditions.append("level = :level")
                params["level"] = level.value
            
            if start_time:
                conditions.append("timestamp >= :start_time")
                params["start_time"] = start_time
            
            if end_time:
                conditions.append("timestamp <= :end_time")
                params["end_time"] = end_time
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            query_sql = f"""
            SELECT * FROM audit_logs 
            WHERE {where_clause}
            ORDER BY timestamp DESC
            LIMIT :limit OFFSET :offset
            """
            
            params.update({"limit": limit, "offset": offset})
            
            result = db.execute(text(query_sql), params)
            logs = [dict(row) for row in result.fetchall()]
            
            return logs
            
        except Exception as e:
            logger.error(f"查询审计日志失败: {e}")
            return []
        finally:
            if db:
                db.close()
    
    async def get_statistics(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """获取审计统计信息"""
        try:
            db = next(get_db())
            
            # 默认查询最近30天
            if not start_time:
                start_time = datetime.now() - timedelta(days=30)
            if not end_time:
                end_time = datetime.now()
            
            # 总日志数
            total_sql = """
            SELECT COUNT(*) as total FROM audit_logs 
            WHERE timestamp BETWEEN :start_time AND :end_time
            """
            total_result = db.execute(text(total_sql), {
                "start_time": start_time,
                "end_time": end_time
            }).fetchone()
            total_logs = total_result[0] if total_result else 0
            
            # 按操作类型统计
            action_sql = """
            SELECT action, COUNT(*) as count FROM audit_logs 
            WHERE timestamp BETWEEN :start_time AND :end_time
            GROUP BY action ORDER BY count DESC
            """
            action_result = db.execute(text(action_sql), {
                "start_time": start_time,
                "end_time": end_time
            }).fetchall()
            actions_stats = {row[0]: row[1] for row in action_result}
            
            # 按资源类型统计
            resource_sql = """
            SELECT resource, COUNT(*) as count FROM audit_logs 
            WHERE timestamp BETWEEN :start_time AND :end_time
            GROUP BY resource ORDER BY count DESC
            """
            resource_result = db.execute(text(resource_sql), {
                "start_time": start_time,
                "end_time": end_time
            }).fetchall()
            resources_stats = {row[0]: row[1] for row in resource_result}
            
            # 按级别统计
            level_sql = """
            SELECT level, COUNT(*) as count FROM audit_logs 
            WHERE timestamp BETWEEN :start_time AND :end_time
            GROUP BY level ORDER BY count DESC
            """
            level_result = db.execute(text(level_sql), {
                "start_time": start_time,
                "end_time": end_time
            }).fetchall()
            levels_stats = {row[0]: row[1] for row in level_result}
            
            # 活跃用户统计
            user_sql = """
            SELECT username, COUNT(*) as count FROM audit_logs 
            WHERE timestamp BETWEEN :start_time AND :end_time AND username IS NOT NULL
            GROUP BY username ORDER BY count DESC LIMIT 10
            """
            user_result = db.execute(text(user_sql), {
                "start_time": start_time,
                "end_time": end_time
            }).fetchall()
            users_stats = {row[0]: row[1] for row in user_result}
            
            return {
                "total_logs": total_logs,
                "time_range": {
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat()
                },
                "actions": actions_stats,
                "resources": resources_stats,
                "levels": levels_stats,
                "active_users": users_stats
            }
            
        except Exception as e:
            logger.error(f"获取审计统计失败: {e}")
            return {}
        finally:
            if db:
                db.close()


# 创建全局审计服务实例
audit_service = AuditService()


# 便捷函数
async def log_user_action(
    user: User,
    action: AuditAction,
    resource: AuditResource,
    resource_id: Optional[str] = None,
    resource_name: Optional[str] = None,
    description: str = "",
    details: Optional[Dict[str, Any]] = None,
    level: AuditLevel = AuditLevel.LOW,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    session_id: Optional[str] = None
):
    """记录用户操作日志"""
    await audit_service.log_action(
        user_id=user.id,
        username=user.username,
        action=action,
        resource=resource,
        resource_id=resource_id,
        resource_name=resource_name,
        level=level,
        description=description,
        details=details,
        ip_address=ip_address,
        user_agent=user_agent,
        session_id=session_id
    )


async def log_system_action(
    action: AuditAction,
    resource: AuditResource,
    resource_id: Optional[str] = None,
    resource_name: Optional[str] = None,
    description: str = "",
    details: Optional[Dict[str, Any]] = None,
    level: AuditLevel = AuditLevel.MEDIUM
):
    """记录系统操作日志"""
    await audit_service.log_action(
        username="system",
        action=action,
        resource=resource,
        resource_id=resource_id,
        resource_name=resource_name,
        level=level,
        description=description,
        details=details
    )
