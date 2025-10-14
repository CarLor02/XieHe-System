"""
系统管理相关模型

包含系统配置、日志、监控、告警、通知等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
"""

import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Boolean, Enum, Float, JSON, func
from .base import Base


# 枚举定义
class LogLevelEnum(str, enum.Enum):
    """日志级别枚举"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class LogCategoryEnum(str, enum.Enum):
    """日志分类枚举"""
    USER = "USER"
    SYSTEM = "SYSTEM"
    DATABASE = "DATABASE"
    API = "API"
    SECURITY = "SECURITY"
    DICOM = "DICOM"
    AI = "AI"
    REPORT = "REPORT"
    NOTIFICATION = "NOTIFICATION"


class AlertLevelEnum(str, enum.Enum):
    """告警级别枚举"""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class NotificationTypeEnum(str, enum.Enum):
    """通知类型枚举"""
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    SUCCESS = "SUCCESS"
    SYSTEM = "SYSTEM"
    REMINDER = "REMINDER"


class NotificationStatusEnum(str, enum.Enum):
    """通知状态枚举"""
    PENDING = "PENDING"
    SENT = "SENT"
    READ = "READ"
    FAILED = "FAILED"
    EXPIRED = "EXPIRED"


class ConfigTypeEnum(str, enum.Enum):
    """配置类型枚举"""
    SYSTEM = "SYSTEM"
    DATABASE = "DATABASE"
    SECURITY = "SECURITY"
    NOTIFICATION = "NOTIFICATION"
    AI = "AI"
    DICOM = "DICOM"
    STORAGE = "STORAGE"
    NETWORK = "NETWORK"
    UI = "UI"
    WORKFLOW = "WORKFLOW"


class DataTypeEnum(str, enum.Enum):
    """数据类型枚举"""
    STRING = "STRING"
    INTEGER = "INTEGER"
    FLOAT = "FLOAT"
    BOOLEAN = "BOOLEAN"
    JSON = "JSON"
    ARRAY = "ARRAY"
    DATE = "DATE"
    DATETIME = "DATETIME"


class SystemConfig(Base):
    """系统配置表"""
    __tablename__ = "system_configs"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="配置ID")
    config_key = Column(String(100), unique=True, nullable=False, comment="配置键")
    config_name = Column(String(200), nullable=False, comment="配置名称")
    config_type = Column(Enum(ConfigTypeEnum), nullable=False, comment="配置类型")
    data_type = Column(Enum(DataTypeEnum), nullable=False, comment="数据类型")
    config_value = Column(Text, comment="配置值")
    default_value = Column(Text, comment="默认值")
    description = Column(Text, comment="描述")
    is_required = Column(Boolean, default=False, comment="是否必需")
    is_encrypted = Column(Boolean, default=False, comment="是否加密")
    is_readonly = Column(Boolean, default=False, comment="是否只读")
    is_system = Column(Boolean, default=False, comment="是否系统配置")
    validation_rules = Column(JSON, comment="验证规则")
    allowed_values = Column(JSON, comment="允许的值")
    min_value = Column(Float, comment="最小值")
    max_value = Column(Float, comment="最大值")
    config_group = Column(String(100), comment="配置组")
    sort_order = Column(Integer, comment="排序")
    is_active = Column(Boolean, default=True, comment="是否激活")
    last_modified_at = Column(DateTime, comment="最后修改时间")
    last_modified_by = Column(Integer, comment="最后修改人ID")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")


class SystemLog(Base):
    """系统日志表"""
    __tablename__ = "system_logs"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="日志ID")
    log_level = Column(Enum(LogLevelEnum), nullable=False, comment="日志级别")
    log_category = Column(Enum(LogCategoryEnum), nullable=False, comment="日志分类")
    log_message = Column(Text, nullable=False, comment="日志消息")
    log_details = Column(JSON, comment="日志详情")
    operation = Column(String(100), comment="操作")
    resource_type = Column(String(50), comment="资源类型")
    resource_id = Column(String(100), comment="资源ID")
    user_id = Column(Integer, comment="用户ID")
    username = Column(String(100), comment="用户名")
    session_id = Column(String(100), comment="会话ID")
    ip_address = Column(String(45), comment="IP地址")
    user_agent = Column(String(500), comment="用户代理")
    request_method = Column(String(10), comment="请求方法")
    request_url = Column(String(500), comment="请求URL")
    request_params = Column(JSON, comment="请求参数")
    response_status = Column(Integer, comment="响应状态")
    response_time = Column(Float, comment="响应时间(ms)")
    exception_type = Column(String(200), comment="异常类型")
    exception_message = Column(Text, comment="异常消息")
    stack_trace = Column(Text, comment="堆栈跟踪")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    log_date = Column(Date, nullable=False, comment="日志日期")


class SystemMonitor(Base):
    """系统监控表"""
    __tablename__ = "system_monitors"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="监控ID")
    monitor_time = Column(DateTime, nullable=False, comment="监控时间")
    server_name = Column(String(100), nullable=False, comment="服务器名称")
    cpu_usage = Column(Float, comment="CPU使用率(%)")
    cpu_load_1m = Column(Float, comment="1分钟负载")
    cpu_load_5m = Column(Float, comment="5分钟负载")
    cpu_load_15m = Column(Float, comment="15分钟负载")
    memory_total = Column(Integer, comment="总内存(MB)")
    memory_used = Column(Integer, comment="已用内存(MB)")
    memory_free = Column(Integer, comment="空闲内存(MB)")
    memory_usage = Column(Float, comment="内存使用率(%)")
    disk_total = Column(Integer, comment="总磁盘(GB)")
    disk_used = Column(Integer, comment="已用磁盘(GB)")
    disk_free = Column(Integer, comment="空闲磁盘(GB)")
    disk_usage = Column(Float, comment="磁盘使用率(%)")
    network_in = Column(Integer, comment="网络入流量(MB)")
    network_out = Column(Integer, comment="网络出流量(MB)")
    db_connections = Column(Integer, comment="数据库连接数")
    db_queries_per_sec = Column(Float, comment="每秒查询数")
    db_slow_queries = Column(Integer, comment="慢查询数")
    active_users = Column(Integer, comment="活跃用户数")
    active_sessions = Column(Integer, comment="活跃会话数")
    request_count = Column(Integer, comment="请求数")
    error_count = Column(Integer, comment="错误数")
    studies_processed = Column(Integer, comment="处理的检查数")
    reports_generated = Column(Integer, comment="生成的报告数")
    ai_tasks_completed = Column(Integer, comment="完成的AI任务数")
    additional_metrics = Column(JSON, comment="附加指标")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")


class SystemAlert(Base):
    """系统告警表"""
    __tablename__ = "system_alerts"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="告警ID")
    alert_type = Column(String(50), nullable=False, comment="告警类型")
    alert_level = Column(Enum(AlertLevelEnum), nullable=False, comment="告警级别")
    alert_title = Column(String(200), nullable=False, comment="告警标题")
    alert_message = Column(Text, nullable=False, comment="告警消息")
    source_type = Column(String(50), comment="来源类型")
    source_id = Column(String(100), comment="来源ID")
    server_name = Column(String(100), comment="服务器名称")
    is_resolved = Column(Boolean, default=False, comment="是否已解决")
    resolved_at = Column(DateTime, comment="解决时间")
    resolved_by = Column(Integer, comment="解决人ID")
    resolution_notes = Column(Text, comment="解决备注")
    alert_data = Column(JSON, comment="告警数据")
    threshold_value = Column(Float, comment="阈值")
    current_value = Column(Float, comment="当前值")
    notification_sent = Column(Boolean, default=False, comment="是否已发送通知")
    notification_count = Column(Integer, default=0, comment="通知次数")
    last_notification_at = Column(DateTime, comment="最后通知时间")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")


class Notification(Base):
    """通知消息表"""
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="通知ID")
    notification_type = Column(Enum(NotificationTypeEnum), nullable=False, comment="通知类型")
    title = Column(String(200), nullable=False, comment="标题")
    content = Column(Text, nullable=False, comment="内容")
    status = Column(Enum(NotificationStatusEnum), default=NotificationStatusEnum.PENDING, comment="状态")
    recipient_id = Column(Integer, comment="接收人ID")
    recipient_type = Column(String(50), comment="接收人类型")
    recipient_email = Column(String(200), comment="接收人邮箱")
    recipient_phone = Column(String(20), comment="接收人电话")
    sender_id = Column(Integer, comment="发送人ID")
    sender_name = Column(String(100), comment="发送人姓名")
    channels = Column(JSON, comment="发送渠道")
    related_type = Column(String(50), comment="关联类型")
    related_id = Column(String(100), comment="关联ID")
    related_data = Column(JSON, comment="关联数据")
    scheduled_at = Column(DateTime, comment="计划发送时间")
    sent_at = Column(DateTime, comment="发送时间")
    read_at = Column(DateTime, comment="阅读时间")
    expires_at = Column(DateTime, comment="过期时间")
    retry_count = Column(Integer, default=0, comment="重试次数")
    max_retries = Column(Integer, default=3, comment="最大重试次数")
    last_error = Column(Text, comment="最后错误")
    priority = Column(Integer, default=0, comment="优先级")
    tags = Column(JSON, comment="标签")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")

