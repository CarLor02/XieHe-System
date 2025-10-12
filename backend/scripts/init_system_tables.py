#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
系统配置表初始化脚本

创建系统配置相关的数据库表并插入测试数据。
包含系统配置、操作日志、通知消息、系统监控、系统告警等表。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import sys
import os
import io

# 设置标准输出编码为UTF-8（解决Windows下emoji显示问题）
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
import secrets
import hashlib
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
import json
from dotenv import load_dotenv

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 加载backend目录下的.env文件
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# 创建Base
Base = declarative_base()

# 重新定义模型以避免配置依赖
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey, Enum, JSON, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

# 从环境变量读取数据库配置
MYSQL_HOST = os.getenv("DB_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("DB_PORT", "3306"))
MYSQL_USER = os.getenv("DB_USER", "root")
MYSQL_PASSWORD = os.getenv("DB_PASSWORD", "123456")
MYSQL_DATABASE = os.getenv("DB_NAME", "medical_imaging_system")

# 构建数据库URL
DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    f"?charset=utf8mb4"
)

# 枚举定义
class ConfigTypeEnum(str, enum.Enum):
    SYSTEM = "system"
    DATABASE = "database"
    SECURITY = "security"
    NOTIFICATION = "notification"
    AI = "ai"
    DICOM = "dicom"
    STORAGE = "storage"
    NETWORK = "network"
    UI = "ui"
    WORKFLOW = "workflow"

class ConfigDataTypeEnum(str, enum.Enum):
    STRING = "string"
    INTEGER = "integer"
    FLOAT = "float"
    BOOLEAN = "boolean"
    JSON = "json"
    ARRAY = "array"
    DATE = "date"
    DATETIME = "datetime"

class LogLevelEnum(str, enum.Enum):
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"

class LogCategoryEnum(str, enum.Enum):
    USER = "user"
    SYSTEM = "system"
    DATABASE = "database"
    API = "api"
    SECURITY = "security"
    DICOM = "dicom"
    AI = "ai"
    REPORT = "report"
    NOTIFICATION = "notification"

class NotificationTypeEnum(str, enum.Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"
    SYSTEM = "system"
    REMINDER = "reminder"

class NotificationStatusEnum(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    READ = "read"
    FAILED = "failed"
    EXPIRED = "expired"

# 简化的模型定义
class SystemConfig(Base):
    __tablename__ = 'system_configs'
    
    id = Column(Integer, primary_key=True)
    config_key = Column(String(100), unique=True, nullable=False)
    config_name = Column(String(200), nullable=False)
    config_type = Column(Enum(ConfigTypeEnum), nullable=False)
    data_type = Column(Enum(ConfigDataTypeEnum), nullable=False)
    config_value = Column(Text, nullable=True)
    default_value = Column(Text, nullable=True)
    description = Column(Text, nullable=True)
    is_required = Column(Boolean, default=False)
    is_encrypted = Column(Boolean, default=False)
    is_readonly = Column(Boolean, default=False)
    is_system = Column(Boolean, default=False)
    validation_rules = Column(JSON, nullable=True)
    allowed_values = Column(JSON, nullable=True)
    min_value = Column(Float, nullable=True)
    max_value = Column(Float, nullable=True)
    config_group = Column(String(100), nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    last_modified_at = Column(DateTime, nullable=True)
    last_modified_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)

class SystemLog(Base):
    __tablename__ = 'system_logs'
    
    id = Column(Integer, primary_key=True)
    log_level = Column(Enum(LogLevelEnum), nullable=False)
    log_category = Column(Enum(LogCategoryEnum), nullable=False)
    log_message = Column(Text, nullable=False)
    log_details = Column(JSON, nullable=True)
    operation = Column(String(100), nullable=True)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(String(100), nullable=True)
    user_id = Column(Integer, nullable=True)
    username = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    request_method = Column(String(10), nullable=True)
    request_url = Column(String(500), nullable=True)
    request_params = Column(JSON, nullable=True)
    response_status = Column(Integer, nullable=True)
    response_time = Column(Float, nullable=True)
    exception_type = Column(String(200), nullable=True)
    exception_message = Column(Text, nullable=True)
    stack_trace = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    log_date = Column(Date, nullable=False)

class Notification(Base):
    __tablename__ = 'notifications'
    
    id = Column(Integer, primary_key=True)
    notification_type = Column(Enum(NotificationTypeEnum), nullable=False)
    title = Column(String(200), nullable=False)
    content = Column(Text, nullable=False)
    status = Column(Enum(NotificationStatusEnum), default=NotificationStatusEnum.PENDING)
    recipient_id = Column(Integer, nullable=True)
    recipient_type = Column(String(50), nullable=True)
    recipient_email = Column(String(200), nullable=True)
    recipient_phone = Column(String(20), nullable=True)
    sender_id = Column(Integer, nullable=True)
    sender_name = Column(String(100), nullable=True)
    channels = Column(JSON, nullable=True)
    related_type = Column(String(50), nullable=True)
    related_id = Column(String(100), nullable=True)
    related_data = Column(JSON, nullable=True)
    scheduled_at = Column(DateTime, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    read_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_error = Column(Text, nullable=True)
    priority = Column(Integer, default=0)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)

class SystemMonitor(Base):
    __tablename__ = 'system_monitors'
    
    id = Column(Integer, primary_key=True)
    monitor_time = Column(DateTime, nullable=False)
    server_name = Column(String(100), nullable=False)
    cpu_usage = Column(Float, nullable=True)
    cpu_load_1m = Column(Float, nullable=True)
    cpu_load_5m = Column(Float, nullable=True)
    cpu_load_15m = Column(Float, nullable=True)
    memory_total = Column(Integer, nullable=True)
    memory_used = Column(Integer, nullable=True)
    memory_free = Column(Integer, nullable=True)
    memory_usage = Column(Float, nullable=True)
    disk_total = Column(Integer, nullable=True)
    disk_used = Column(Integer, nullable=True)
    disk_free = Column(Integer, nullable=True)
    disk_usage = Column(Float, nullable=True)
    network_in = Column(Integer, nullable=True)
    network_out = Column(Integer, nullable=True)
    db_connections = Column(Integer, nullable=True)
    db_queries_per_sec = Column(Float, nullable=True)
    db_slow_queries = Column(Integer, nullable=True)
    active_users = Column(Integer, nullable=True)
    active_sessions = Column(Integer, nullable=True)
    request_count = Column(Integer, nullable=True)
    error_count = Column(Integer, nullable=True)
    studies_processed = Column(Integer, nullable=True)
    reports_generated = Column(Integer, nullable=True)
    ai_tasks_completed = Column(Integer, nullable=True)
    additional_metrics = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())

class SystemAlert(Base):
    __tablename__ = 'system_alerts'
    
    id = Column(Integer, primary_key=True)
    alert_type = Column(String(50), nullable=False)
    alert_level = Column(Enum(LogLevelEnum), nullable=False)
    alert_title = Column(String(200), nullable=False)
    alert_message = Column(Text, nullable=False)
    source_type = Column(String(50), nullable=True)
    source_id = Column(String(100), nullable=True)
    server_name = Column(String(100), nullable=True)
    is_resolved = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(Integer, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    alert_data = Column(JSON, nullable=True)
    threshold_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    notification_sent = Column(Boolean, default=False)
    notification_count = Column(Integer, default=0)
    last_notification_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)


def main():
    print("🚀 开始初始化系统配置表...")
    print("=" * 60)
    
    try:
        # 创建数据库引擎
        engine = create_engine(DATABASE_URL, echo=True)
        
        # 创建会话
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        print("🔧 初始化数据库表结构...")
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表结构创建成功!")
        
        print("⚙️ 初始化系统配置数据...")
        
        # 创建系统配置数据
        configs_data = [
            # 系统配置
            {
                'config_key': 'system.name',
                'config_name': '系统名称',
                'config_type': ConfigTypeEnum.SYSTEM,
                'data_type': ConfigDataTypeEnum.STRING,
                'config_value': '协和医疗影像诊断系统',
                'default_value': '医疗影像诊断系统',
                'description': '系统显示名称',
                'is_required': True,
                'is_system': True,
                'config_group': '基本信息',
                'sort_order': 1,
                'created_by': 1
            },
            {
                'config_key': 'system.version',
                'config_name': '系统版本',
                'config_type': ConfigTypeEnum.SYSTEM,
                'data_type': ConfigDataTypeEnum.STRING,
                'config_value': '1.0.0',
                'default_value': '1.0.0',
                'description': '当前系统版本号',
                'is_required': True,
                'is_readonly': True,
                'is_system': True,
                'config_group': '基本信息',
                'sort_order': 2,
                'created_by': 1
            },
            {
                'config_key': 'system.max_upload_size',
                'config_name': '最大上传文件大小',
                'config_type': ConfigTypeEnum.SYSTEM,
                'data_type': ConfigDataTypeEnum.INTEGER,
                'config_value': '1073741824',  # 1GB
                'default_value': '1073741824',
                'description': '单个文件最大上传大小(字节)',
                'is_required': True,
                'min_value': 1048576,  # 1MB
                'max_value': 10737418240,  # 10GB
                'config_group': '文件管理',
                'sort_order': 10,
                'created_by': 1
            },
            # 数据库配置
            {
                'config_key': 'database.connection_pool_size',
                'config_name': '数据库连接池大小',
                'config_type': ConfigTypeEnum.DATABASE,
                'data_type': ConfigDataTypeEnum.INTEGER,
                'config_value': '20',
                'default_value': '20',
                'description': '数据库连接池最大连接数',
                'is_required': True,
                'min_value': 5,
                'max_value': 100,
                'config_group': '连接管理',
                'sort_order': 20,
                'created_by': 1
            },
            # 安全配置
            {
                'config_key': 'security.session_timeout',
                'config_name': '会话超时时间',
                'config_type': ConfigTypeEnum.SECURITY,
                'data_type': ConfigDataTypeEnum.INTEGER,
                'config_value': '3600',  # 1小时
                'default_value': '3600',
                'description': '用户会话超时时间(秒)',
                'is_required': True,
                'min_value': 300,  # 5分钟
                'max_value': 86400,  # 24小时
                'config_group': '会话管理',
                'sort_order': 30,
                'created_by': 1
            },
            {
                'config_key': 'security.password_min_length',
                'config_name': '密码最小长度',
                'config_type': ConfigTypeEnum.SECURITY,
                'data_type': ConfigDataTypeEnum.INTEGER,
                'config_value': '8',
                'default_value': '8',
                'description': '用户密码最小长度',
                'is_required': True,
                'min_value': 6,
                'max_value': 32,
                'config_group': '密码策略',
                'sort_order': 31,
                'created_by': 1
            },
            # AI配置
            {
                'config_key': 'ai.enable_auto_analysis',
                'config_name': '启用自动AI分析',
                'config_type': ConfigTypeEnum.AI,
                'data_type': ConfigDataTypeEnum.BOOLEAN,
                'config_value': 'true',
                'default_value': 'true',
                'description': '是否自动对新上传的影像进行AI分析',
                'is_required': True,
                'config_group': 'AI功能',
                'sort_order': 40,
                'created_by': 1
            },
            {
                'config_key': 'ai.confidence_threshold',
                'config_name': 'AI置信度阈值',
                'config_type': ConfigTypeEnum.AI,
                'data_type': ConfigDataTypeEnum.FLOAT,
                'config_value': '0.8',
                'default_value': '0.8',
                'description': 'AI分析结果的最小置信度阈值',
                'is_required': True,
                'min_value': 0.1,
                'max_value': 1.0,
                'config_group': 'AI功能',
                'sort_order': 41,
                'created_by': 1
            },
            # DICOM配置
            {
                'config_key': 'dicom.storage_path',
                'config_name': 'DICOM存储路径',
                'config_type': ConfigTypeEnum.DICOM,
                'data_type': ConfigDataTypeEnum.STRING,
                'config_value': '/data/dicom',
                'default_value': '/data/dicom',
                'description': 'DICOM文件存储根路径',
                'is_required': True,
                'config_group': '存储配置',
                'sort_order': 50,
                'created_by': 1
            },
            # 通知配置
            {
                'config_key': 'notification.email_enabled',
                'config_name': '启用邮件通知',
                'config_type': ConfigTypeEnum.NOTIFICATION,
                'data_type': ConfigDataTypeEnum.BOOLEAN,
                'config_value': 'true',
                'default_value': 'true',
                'description': '是否启用邮件通知功能',
                'is_required': True,
                'config_group': '通知设置',
                'sort_order': 60,
                'created_by': 1
            }
        ]
        
        for config_data in configs_data:
            config = SystemConfig(**config_data)
            session.add(config)
            print(f"   创建配置: {config.config_name} ({config.config_key}) = {config.config_value}")
        
        session.commit()
        
        print("📋 初始化系统日志数据...")
        
        # 创建系统日志数据
        logs_data = [
            {
                'log_level': LogLevelEnum.INFO,
                'log_category': LogCategoryEnum.SYSTEM,
                'log_message': '系统启动成功',
                'log_details': {
                    'startup_time': '2.5s',
                    'modules_loaded': 15,
                    'database_connected': True
                },
                'operation': 'system_startup',
                'user_id': 1,
                'username': 'admin',
                'ip_address': '127.0.0.1',
                'log_date': date.today(),
                'response_time': 2500.0
            },
            {
                'log_level': LogLevelEnum.INFO,
                'log_category': LogCategoryEnum.USER,
                'log_message': '用户登录成功',
                'log_details': {
                    'login_method': 'password',
                    'user_role': 'doctor',
                    'department': '影像科'
                },
                'operation': 'user_login',
                'resource_type': 'user',
                'resource_id': '3',
                'user_id': 3,
                'username': 'doctor01',
                'ip_address': '192.168.1.100',
                'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'request_method': 'POST',
                'request_url': '/api/auth/login',
                'response_status': 200,
                'response_time': 150.5,
                'log_date': date.today()
            },
            {
                'log_level': LogLevelEnum.WARNING,
                'log_category': LogCategoryEnum.SECURITY,
                'log_message': '检测到多次登录失败',
                'log_details': {
                    'failed_attempts': 3,
                    'username_attempted': 'unknown_user',
                    'time_window': '5分钟'
                },
                'operation': 'login_failed',
                'ip_address': '192.168.1.200',
                'user_agent': 'curl/7.68.0',
                'request_method': 'POST',
                'request_url': '/api/auth/login',
                'response_status': 401,
                'response_time': 50.0,
                'log_date': date.today()
            }
        ]
        
        for log_data in logs_data:
            log = SystemLog(**log_data)
            session.add(log)
            print(f"   创建日志: {log.log_level.value} - {log.log_message}")
        
        session.commit()
        
        print("🔔 初始化通知消息数据...")
        
        # 创建通知消息数据
        notifications_data = [
            {
                'notification_type': NotificationTypeEnum.SUCCESS,
                'title': '报告审核完成',
                'content': '您的胸部CT报告已通过审核，可以查看最终报告。',
                'status': NotificationStatusEnum.SENT,
                'recipient_id': 1,
                'recipient_type': 'patient',
                'recipient_email': 'zhangsan@example.com',
                'sender_id': 3,
                'sender_name': '李影像医生',
                'channels': ['email', 'system'],
                'related_type': 'report',
                'related_id': '1',
                'related_data': {
                    'report_number': 'RPT202509248691',
                    'patient_name': '张三',
                    'study_description': '胸部CT平扫'
                },
                'sent_at': datetime.now() - timedelta(hours=1),
                'priority': 1,
                'tags': ['报告', '审核', '完成'],
                'created_by': 3
            },
            {
                'notification_type': NotificationTypeEnum.REMINDER,
                'title': '随访提醒',
                'content': '患者张三的肺结节需要在3个月后进行复查，请安排随访。',
                'status': NotificationStatusEnum.PENDING,
                'recipient_id': 3,
                'recipient_type': 'doctor',
                'recipient_email': 'doctor@xiehe.com',
                'sender_id': None,
                'sender_name': '系统自动',
                'channels': ['email', 'system'],
                'related_type': 'follow_up',
                'related_id': '1',
                'related_data': {
                    'patient_id': 1,
                    'patient_name': '张三',
                    'follow_up_date': '2025-12-23',
                    'reason': '肺结节随访'
                },
                'scheduled_at': datetime.now() + timedelta(days=90),
                'expires_at': datetime.now() + timedelta(days=95),
                'priority': 2,
                'tags': ['随访', '提醒', '肺结节'],
                'created_by': None
            },
            {
                'notification_type': NotificationTypeEnum.WARNING,
                'title': '系统资源告警',
                'content': '服务器磁盘使用率已达到85%，请及时清理或扩容。',
                'status': NotificationStatusEnum.SENT,
                'recipient_id': 1,
                'recipient_type': 'admin',
                'recipient_email': 'admin@xiehe.com',
                'sender_id': None,
                'sender_name': '系统监控',
                'channels': ['email', 'system', 'sms'],
                'related_type': 'system_alert',
                'related_id': 'disk_usage_high',
                'related_data': {
                    'server_name': 'xiehe-app-01',
                    'disk_usage': 85.2,
                    'threshold': 80.0,
                    'available_space': '150GB'
                },
                'sent_at': datetime.now() - timedelta(minutes=30),
                'priority': 3,
                'tags': ['系统', '告警', '磁盘'],
                'created_by': None
            }
        ]
        
        for notification_data in notifications_data:
            notification = Notification(**notification_data)
            session.add(notification)
            print(f"   创建通知: {notification.notification_type.value} - {notification.title}")
        
        session.commit()
        
        print("📊 初始化系统监控数据...")
        
        # 创建系统监控数据
        monitor_data = {
            'monitor_time': datetime.now(),
            'server_name': 'xiehe-app-01',
            'cpu_usage': 45.2,
            'cpu_load_1m': 1.2,
            'cpu_load_5m': 1.5,
            'cpu_load_15m': 1.8,
            'memory_total': 16384,  # 16GB
            'memory_used': 8192,    # 8GB
            'memory_free': 8192,    # 8GB
            'memory_usage': 50.0,
            'disk_total': 1000,     # 1TB
            'disk_used': 852,       # 852GB
            'disk_free': 148,       # 148GB
            'disk_usage': 85.2,
            'network_in': 1024,     # 1MB/s
            'network_out': 512,     # 512KB/s
            'db_connections': 15,
            'db_queries_per_sec': 125.5,
            'db_slow_queries': 2,
            'active_users': 8,
            'active_sessions': 12,
            'request_count': 1250,
            'error_count': 3,
            'studies_processed': 25,
            'reports_generated': 18,
            'ai_tasks_completed': 15,
            'additional_metrics': {
                'cache_hit_rate': 0.95,
                'queue_length': 5,
                'background_jobs': 3
            }
        }
        
        monitor = SystemMonitor(**monitor_data)
        session.add(monitor)
        print(f"   创建监控: {monitor.server_name} - CPU: {monitor.cpu_usage}%, 内存: {monitor.memory_usage}%, 磁盘: {monitor.disk_usage}%")
        
        session.commit()
        
        print("🚨 初始化系统告警数据...")
        
        # 创建系统告警数据
        alert_data = {
            'alert_type': 'disk_usage',
            'alert_level': LogLevelEnum.WARNING,
            'alert_title': '磁盘使用率过高',
            'alert_message': '服务器xiehe-app-01的磁盘使用率已达到85.2%，超过阈值80%',
            'source_type': 'system_monitor',
            'source_id': 'disk_monitor',
            'server_name': 'xiehe-app-01',
            'is_resolved': False,
            'alert_data': {
                'disk_path': '/',
                'total_space': '1TB',
                'used_space': '852GB',
                'free_space': '148GB'
            },
            'threshold_value': 80.0,
            'current_value': 85.2,
            'notification_sent': True,
            'notification_count': 1,
            'last_notification_at': datetime.now() - timedelta(minutes=30),
            'created_by': None
        }
        
        alert = SystemAlert(**alert_data)
        session.add(alert)
        print(f"   创建告警: {alert.alert_level.value} - {alert.alert_title}")
        
        session.commit()
        
        print("=" * 60)
        print("🎉 系统配置表初始化完成!")
        
        # 统计数据
        print("📊 数据统计:")
        config_count = session.query(SystemConfig).count()
        log_count = session.query(SystemLog).count()
        notification_count = session.query(Notification).count()
        monitor_count = session.query(SystemMonitor).count()
        alert_count = session.query(SystemAlert).count()
        
        print(f"   系统配置: {config_count}")
        print(f"   系统日志: {log_count}")
        print(f"   通知消息: {notification_count}")
        print(f"   监控记录: {monitor_count}")
        print(f"   系统告警: {alert_count}")
        
        print("\n⚙️ 主要配置项:")
        configs = session.query(SystemConfig).filter(SystemConfig.is_system == True).all()
        for config in configs:
            print(f"   {config.config_name}: {config.config_value}")
        
        session.close()
        
    except Exception as e:
        print(f"❌ 初始化失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ 系统配置表初始化成功!")
        print("🎯 系统已准备好进行系统管理功能开发!")
    else:
        print("\n❌ 系统配置表初始化失败!")
        sys.exit(1)
