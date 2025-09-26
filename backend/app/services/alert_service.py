"""
异常告警服务

提供系统异常检测、告警通知和告警管理功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
from dataclasses import dataclass
from collections import defaultdict

from app.services.email_service import send_system_notification
from app.services.monitoring_service import monitoring_service

logger = logging.getLogger(__name__)


class AlertLevel(str, Enum):
    """告警级别"""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    """告警状态"""
    ACTIVE = "active"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"


@dataclass
class Alert:
    """告警数据类"""
    id: str
    title: str
    message: str
    level: AlertLevel
    source: str
    timestamp: datetime
    status: AlertStatus = AlertStatus.ACTIVE
    tags: Dict[str, str] = None
    resolved_at: Optional[datetime] = None
    suppressed_until: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "message": self.message,
            "level": self.level.value,
            "source": self.source,
            "timestamp": self.timestamp.isoformat(),
            "status": self.status.value,
            "tags": self.tags or {},
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "suppressed_until": self.suppressed_until.isoformat() if self.suppressed_until else None
        }


class AlertRule:
    """告警规则类"""
    
    def __init__(
        self,
        name: str,
        condition: Callable[[Dict[str, Any]], bool],
        level: AlertLevel,
        message_template: str,
        cooldown_minutes: int = 30,
        enabled: bool = True
    ):
        self.name = name
        self.condition = condition
        self.level = level
        self.message_template = message_template
        self.cooldown_minutes = cooldown_minutes
        self.enabled = enabled
        self.last_triggered = None
    
    def should_trigger(self, data: Dict[str, Any]) -> bool:
        """检查是否应该触发告警"""
        if not self.enabled:
            return False
        
        # 检查冷却时间
        if self.last_triggered:
            cooldown_end = self.last_triggered + timedelta(minutes=self.cooldown_minutes)
            if datetime.now() < cooldown_end:
                return False
        
        return self.condition(data)
    
    def trigger(self, data: Dict[str, Any]) -> Alert:
        """触发告警"""
        self.last_triggered = datetime.now()
        
        # 生成告警ID
        alert_id = f"{self.name}_{int(self.last_triggered.timestamp())}"
        
        # 渲染消息模板
        message = self.message_template.format(**data)
        
        return Alert(
            id=alert_id,
            title=f"告警: {self.name}",
            message=message,
            level=self.level,
            source="alert_service",
            timestamp=self.last_triggered,
            tags={"rule": self.name}
        )


class AlertService:
    """告警服务类"""
    
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.rules: List[AlertRule] = []
        self.subscribers: Dict[AlertLevel, List[str]] = defaultdict(list)
        self.is_running = False
        self.check_task = None
        self.check_interval = 60  # 秒
        
        # 初始化默认告警规则
        self._init_default_rules()
    
    def _init_default_rules(self):
        """初始化默认告警规则"""
        
        # CPU使用率告警
        cpu_rule = AlertRule(
            name="high_cpu_usage",
            condition=lambda data: data.get("cpu_usage", 0) > 80,
            level=AlertLevel.WARNING,
            message_template="CPU使用率过高: {cpu_usage:.1f}%",
            cooldown_minutes=15
        )
        self.rules.append(cpu_rule)
        
        # 内存使用率告警
        memory_rule = AlertRule(
            name="high_memory_usage",
            condition=lambda data: data.get("memory_usage", 0) > 85,
            level=AlertLevel.WARNING,
            message_template="内存使用率过高: {memory_usage:.1f}%",
            cooldown_minutes=15
        )
        self.rules.append(memory_rule)
        
        # 磁盘使用率告警
        disk_rule = AlertRule(
            name="high_disk_usage",
            condition=lambda data: data.get("disk_usage", 0) > 90,
            level=AlertLevel.ERROR,
            message_template="磁盘使用率过高: {disk_usage:.1f}%",
            cooldown_minutes=30
        )
        self.rules.append(disk_rule)
        
        # API响应时间告警
        api_rule = AlertRule(
            name="slow_api_response",
            condition=lambda data: data.get("avg_api_response_time", 0) > 3.0,
            level=AlertLevel.WARNING,
            message_template="API响应时间过慢: 平均 {avg_api_response_time:.2f}秒",
            cooldown_minutes=10
        )
        self.rules.append(api_rule)
        
        # 数据库查询时间告警
        db_rule = AlertRule(
            name="slow_db_query",
            condition=lambda data: data.get("avg_db_query_time", 0) > 2.0,
            level=AlertLevel.WARNING,
            message_template="数据库查询时间过长: 平均 {avg_db_query_time:.2f}秒",
            cooldown_minutes=10
        )
        self.rules.append(db_rule)
        
        # 系统错误率告警
        error_rule = AlertRule(
            name="high_error_rate",
            condition=lambda data: data.get("error_rate", 0) > 5.0,
            level=AlertLevel.ERROR,
            message_template="系统错误率过高: {error_rate:.1f}%",
            cooldown_minutes=5
        )
        self.rules.append(error_rule)
    
    async def start(self):
        """启动告警服务"""
        if not self.is_running:
            self.is_running = True
            self.check_task = asyncio.create_task(self._check_alerts())
            logger.info("告警服务已启动")
    
    async def stop(self):
        """停止告警服务"""
        if self.is_running:
            self.is_running = False
            if self.check_task:
                self.check_task.cancel()
                try:
                    await self.check_task
                except asyncio.CancelledError:
                    pass
            logger.info("告警服务已停止")
    
    async def _check_alerts(self):
        """检查告警条件"""
        while self.is_running:
            try:
                # 获取系统状态数据
                status_data = monitoring_service.get_current_status()
                
                if "error" not in status_data:
                    # 提取关键指标
                    system_data = status_data.get("system", {})
                    api_perf = status_data.get("api_performance", {})
                    db_perf = status_data.get("database_performance", {})
                    
                    check_data = {
                        "cpu_usage": system_data.get("cpu_usage", 0),
                        "memory_usage": system_data.get("memory_usage", 0),
                        "disk_usage": system_data.get("disk_usage", 0),
                        "avg_api_response_time": api_perf.get("avg", 0),
                        "avg_db_query_time": db_perf.get("avg", 0),
                        "error_rate": 0  # 需要从错误监控服务获取
                    }
                    
                    # 检查所有规则
                    for rule in self.rules:
                        if rule.should_trigger(check_data):
                            alert = rule.trigger(check_data)
                            await self._handle_alert(alert)
                
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                logger.error(f"检查告警失败: {e}")
                await asyncio.sleep(10)
    
    async def _handle_alert(self, alert: Alert):
        """处理告警"""
        try:
            # 存储告警
            self.alerts[alert.id] = alert
            
            logger.warning(f"触发告警: {alert.title} - {alert.message}")
            
            # 发送通知
            await self._send_alert_notifications(alert)
            
            # 清理过期告警
            await self._cleanup_old_alerts()
            
        except Exception as e:
            logger.error(f"处理告警失败: {e}")
    
    async def _send_alert_notifications(self, alert: Alert):
        """发送告警通知"""
        try:
            # 获取订阅者
            subscribers = self.subscribers.get(alert.level, [])
            
            # 发送邮件通知
            for email in subscribers:
                try:
                    await send_system_notification(
                        email=email,
                        title=alert.title,
                        message=alert.message,
                        action_url="/admin/monitoring",
                        action_text="查看监控"
                    )
                except Exception as e:
                    logger.error(f"发送告警邮件失败: {email} - {e}")
            
            # 如果是严重告警且没有订阅者，发送给管理员
            if alert.level in [AlertLevel.ERROR, AlertLevel.CRITICAL] and not subscribers:
                admin_emails = ["admin@xiehe-medical.com"]  # 默认管理员邮箱
                for email in admin_emails:
                    try:
                        await send_system_notification(
                            email=email,
                            title=f"[{alert.level.value.upper()}] {alert.title}",
                            message=alert.message,
                            action_url="/admin/monitoring",
                            action_text="立即查看"
                        )
                    except Exception as e:
                        logger.error(f"发送管理员告警邮件失败: {email} - {e}")
                        
        except Exception as e:
            logger.error(f"发送告警通知失败: {e}")
    
    async def _cleanup_old_alerts(self):
        """清理过期告警"""
        try:
            cutoff_time = datetime.now() - timedelta(days=7)
            expired_alerts = [
                alert_id for alert_id, alert in self.alerts.items()
                if alert.timestamp < cutoff_time and alert.status == AlertStatus.RESOLVED
            ]
            
            for alert_id in expired_alerts:
                del self.alerts[alert_id]
            
            if expired_alerts:
                logger.info(f"清理了 {len(expired_alerts)} 个过期告警")
                
        except Exception as e:
            logger.error(f"清理过期告警失败: {e}")
    
    def add_rule(self, rule: AlertRule):
        """添加告警规则"""
        self.rules.append(rule)
        logger.info(f"添加告警规则: {rule.name}")
    
    def remove_rule(self, rule_name: str) -> bool:
        """移除告警规则"""
        for i, rule in enumerate(self.rules):
            if rule.name == rule_name:
                del self.rules[i]
                logger.info(f"移除告警规则: {rule_name}")
                return True
        return False
    
    def subscribe(self, email: str, levels: List[AlertLevel]):
        """订阅告警通知"""
        for level in levels:
            if email not in self.subscribers[level]:
                self.subscribers[level].append(email)
        logger.info(f"用户 {email} 订阅了告警级别: {[l.value for l in levels]}")
    
    def unsubscribe(self, email: str, levels: List[AlertLevel] = None):
        """取消订阅告警通知"""
        if levels is None:
            # 取消所有级别的订阅
            for level_subscribers in self.subscribers.values():
                if email in level_subscribers:
                    level_subscribers.remove(email)
        else:
            for level in levels:
                if email in self.subscribers[level]:
                    self.subscribers[level].remove(email)
        logger.info(f"用户 {email} 取消了告警订阅")
    
    def get_active_alerts(self) -> List[Alert]:
        """获取活跃告警"""
        return [alert for alert in self.alerts.values() if alert.status == AlertStatus.ACTIVE]
    
    def get_alert_history(self, hours: int = 24) -> List[Alert]:
        """获取告警历史"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        return [
            alert for alert in self.alerts.values()
            if alert.timestamp >= cutoff_time
        ]
    
    def resolve_alert(self, alert_id: str) -> bool:
        """解决告警"""
        if alert_id in self.alerts:
            self.alerts[alert_id].status = AlertStatus.RESOLVED
            self.alerts[alert_id].resolved_at = datetime.now()
            logger.info(f"告警已解决: {alert_id}")
            return True
        return False
    
    def suppress_alert(self, alert_id: str, minutes: int = 60) -> bool:
        """抑制告警"""
        if alert_id in self.alerts:
            self.alerts[alert_id].status = AlertStatus.SUPPRESSED
            self.alerts[alert_id].suppressed_until = datetime.now() + timedelta(minutes=minutes)
            logger.info(f"告警已抑制 {minutes} 分钟: {alert_id}")
            return True
        return False
    
    def get_statistics(self) -> Dict[str, Any]:
        """获取告警统计"""
        total_alerts = len(self.alerts)
        active_alerts = len(self.get_active_alerts())
        
        # 按级别统计
        level_stats = defaultdict(int)
        for alert in self.alerts.values():
            level_stats[alert.level.value] += 1
        
        # 按状态统计
        status_stats = defaultdict(int)
        for alert in self.alerts.values():
            status_stats[alert.status.value] += 1
        
        return {
            "total_alerts": total_alerts,
            "active_alerts": active_alerts,
            "resolved_alerts": status_stats.get("resolved", 0),
            "suppressed_alerts": status_stats.get("suppressed", 0),
            "alerts_by_level": dict(level_stats),
            "alerts_by_status": dict(status_stats),
            "total_rules": len(self.rules),
            "enabled_rules": len([r for r in self.rules if r.enabled]),
            "total_subscribers": sum(len(subs) for subs in self.subscribers.values())
        }


# 创建全局告警服务实例
alert_service = AlertService()


# 便捷函数
async def create_manual_alert(
    title: str,
    message: str,
    level: AlertLevel = AlertLevel.INFO,
    source: str = "manual"
) -> Alert:
    """手动创建告警"""
    alert_id = f"manual_{int(datetime.now().timestamp())}"
    alert = Alert(
        id=alert_id,
        title=title,
        message=message,
        level=level,
        source=source,
        timestamp=datetime.now()
    )
    
    await alert_service._handle_alert(alert)
    return alert
