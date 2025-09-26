"""
配置管理模块

提供环境变量管理、配置验证、敏感信息处理等功能。
支持多环境配置和动态配置更新。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import os
import secrets
from typing import Any, Dict, List, Optional, Union
from pathlib import Path

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings

from pydantic import validator, Field, AnyHttpUrl, EmailStr


class Settings(BaseSettings):
    """
    应用配置类
    
    使用 Pydantic BaseSettings 自动从环境变量读取配置。
    支持类型验证、默认值设置和配置验证。
    """
    
    # ==========================================
    # 基础应用配置
    # ==========================================
    
    PROJECT_NAME: str = "协和医疗影像诊断系统"
    PROJECT_DESCRIPTION: str = "基于AI的医疗影像诊断系统，支持DICOM影像处理、智能诊断、报告生成等功能"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 环境配置
    ENVIRONMENT: str = Field(default="development", pattern="^(development|staging|production)$")
    DEBUG: bool = True
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    
    # ==========================================
    # 数据库配置
    # ==========================================
    
    # MySQL 配置
    MYSQL_HOST: str = "127.0.0.1"
    MYSQL_PORT: int = 3306
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = "123456"
    MYSQL_DATABASE: str = "xiehe_medical"
    
    # 数据库连接池配置
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    # 完整数据库URL
    DATABASE_URL: Optional[str] = None
    
    @validator("DATABASE_URL", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """组装数据库连接URL"""
        if isinstance(v, str):
            return v
        return (
            f"mysql+pymysql://{values.get('MYSQL_USER')}:{values.get('MYSQL_PASSWORD')}"
            f"@{values.get('MYSQL_HOST')}:{values.get('MYSQL_PORT')}/{values.get('MYSQL_DATABASE')}"
        )
    
    # ==========================================
    # Redis 缓存配置
    # ==========================================
    
    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6380
    REDIS_PASSWORD: str = ""
    REDIS_DB: int = 0
    REDIS_POOL_SIZE: int = 10
    REDIS_POOL_TIMEOUT: int = 10
    
    # 完整Redis URL
    REDIS_URL: Optional[str] = None
    
    @validator("REDIS_URL", pre=True)
    def assemble_redis_connection(cls, v: Optional[str], values: Dict[str, Any]) -> str:
        """组装Redis连接URL"""
        if isinstance(v, str):
            return v
        
        password = values.get('REDIS_PASSWORD')
        if password:
            return (
                f"redis://:{password}@{values.get('REDIS_HOST')}:"
                f"{values.get('REDIS_PORT')}/{values.get('REDIS_DB')}"
            )
        else:
            return (
                f"redis://{values.get('REDIS_HOST')}:"
                f"{values.get('REDIS_PORT')}/{values.get('REDIS_DB')}"
            )
    
    # ==========================================
    # JWT 认证配置
    # ==========================================
    
    JWT_SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # 密码配置
    PASSWORD_HASH_ALGORITHM: str = "bcrypt"
    PASSWORD_HASH_ROUNDS: int = 12
    PASSWORD_MIN_LENGTH: int = 8
    
    # ==========================================
    # 文件存储配置
    # ==========================================
    
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 104857600  # 100MB
    ALLOWED_FILE_TYPES: str = "dcm,jpg,jpeg,png,pdf,doc,docx"
    
    DICOM_STORAGE_DIR: str = "dicom"
    DICOM_TEMP_DIR: str = "temp/dicom"
    
    STATIC_DIR: str = "static"
    STATIC_URL: str = "/static"
    
    @validator("ALLOWED_FILE_TYPES")
    def validate_file_types(cls, v: str) -> List[str]:
        """验证并转换文件类型列表"""
        return [ext.strip().lower() for ext in v.split(",")]
    
    # ==========================================
    # 邮件配置
    # ==========================================
    
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_TLS: bool = True
    SMTP_SSL: bool = False
    
    MAIL_FROM: Optional[EmailStr] = None
    MAIL_FROM_NAME: str = "协和医疗影像诊断系统"
    
    # ==========================================
    # 日志配置
    # ==========================================
    
    LOG_LEVEL: str = Field(default="INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    LOG_DIR: str = "logs"
    LOG_FILE: str = "app.log"
    LOG_MAX_SIZE: int = 10485760  # 10MB
    LOG_BACKUP_COUNT: int = 5
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    # ==========================================
    # 安全配置
    # ==========================================
    
    ALLOWED_HOSTS: List[str] = ["*"]
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    
    @validator("ALLOWED_HOSTS", pre=True)
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        """解析允许的主机列表"""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """解析CORS源列表"""
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # API 安全配置
    API_RATE_LIMIT: str = "100/minute"
    API_RATE_LIMIT_STORAGE: str = "redis"
    
    # 文件上传安全
    UPLOAD_VIRUS_SCAN: bool = False
    UPLOAD_CONTENT_TYPE_CHECK: bool = True
    
    # ==========================================
    # AI 模型配置
    # ==========================================
    
    AI_MODEL_SERVER_URL: str = "http://localhost:8001"
    AI_MODEL_TIMEOUT: int = 300
    AI_MODEL_MAX_CONCURRENT: int = 5
    AI_MODEL_STORAGE_DIR: str = "models"
    AI_MODEL_CACHE_SIZE: int = 1000
    
    # ==========================================
    # 监控配置
    # ==========================================
    
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    HEALTH_CHECK_INTERVAL: int = 60
    HEALTH_CHECK_TIMEOUT: int = 10
    
    # ==========================================
    # 开发环境配置
    # ==========================================
    
    RELOAD: bool = True
    RELOAD_DIRS: List[str] = ["app"]
    RELOAD_EXCLUDES: List[str] = ["*.pyc", "*.pyo", "__pycache__"]
    
    @validator("RELOAD_DIRS", pre=True)
    def assemble_reload_dirs(cls, v: Union[str, List[str]]) -> List[str]:
        """解析重载目录列表"""
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    @validator("RELOAD_EXCLUDES", pre=True)
    def assemble_reload_excludes(cls, v: Union[str, List[str]]) -> List[str]:
        """解析重载排除列表"""
        if isinstance(v, str):
            return [i.strip() for i in v.split(",")]
        return v
    
    # ==========================================
    # 配置验证
    # ==========================================
    
    @validator("ENVIRONMENT")
    def validate_environment(cls, v: str) -> str:
        """验证环境配置"""
        if v not in ["development", "staging", "production"]:
            raise ValueError("ENVIRONMENT must be one of: development, staging, production")
        return v
    
    @validator("SECRET_KEY")
    def validate_secret_key(cls, v: str, values: Dict[str, Any]) -> str:
        """验证密钥强度"""
        if values.get("ENVIRONMENT") == "production" and len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production")
        return v
    
    # ==========================================
    # 配置类设置
    # ==========================================
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        
        # 字段别名
        fields = {
            "MYSQL_HOST": {"env": ["MYSQL_HOST", "DB_HOST"]},
            "MYSQL_PORT": {"env": ["MYSQL_PORT", "DB_PORT"]},
            "MYSQL_USER": {"env": ["MYSQL_USER", "DB_USER"]},
            "MYSQL_PASSWORD": {"env": ["MYSQL_PASSWORD", "DB_PASSWORD"]},
            "MYSQL_DATABASE": {"env": ["MYSQL_DATABASE", "DB_NAME"]},
        }


# 创建全局配置实例
settings = Settings()


def get_settings() -> Settings:
    """
    获取配置实例
    
    用于依赖注入的配置获取函数。
    """
    return settings


def reload_settings() -> Settings:
    """
    重新加载配置
    
    用于动态更新配置，主要用于开发环境。
    """
    global settings
    settings = Settings()
    return settings


def validate_settings() -> bool:
    """
    验证配置完整性
    
    检查必要的配置项是否正确设置。
    """
    try:
        # 验证数据库配置
        if not all([
            settings.MYSQL_HOST,
            settings.MYSQL_USER,
            settings.MYSQL_PASSWORD,
            settings.MYSQL_DATABASE
        ]):
            raise ValueError("Database configuration is incomplete")
        
        # 验证Redis配置
        if not settings.REDIS_HOST:
            raise ValueError("Redis configuration is incomplete")
        
        # 验证生产环境安全配置
        if settings.ENVIRONMENT == "production":
            if settings.SECRET_KEY == "your-super-secret-key-change-this-in-production":
                raise ValueError("SECRET_KEY must be changed in production")
            
            if settings.JWT_SECRET_KEY == "your-jwt-secret-key-change-this-in-production":
                raise ValueError("JWT_SECRET_KEY must be changed in production")
            
            if settings.DEBUG:
                raise ValueError("DEBUG must be False in production")
        
        return True
        
    except Exception as e:
        print(f"Configuration validation failed: {e}")
        return False


# 在模块加载时验证配置
if not validate_settings():
    print("Warning: Configuration validation failed. Please check your settings.")


# 导出配置实例
__all__ = ["settings", "get_settings", "reload_settings", "validate_settings"]
