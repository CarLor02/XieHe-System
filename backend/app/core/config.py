"""
医疗影像诊断系统 - 应用配置

使用 Pydantic Settings 管理应用配置，支持从环境变量、.env 文件等多种来源读取配置。

配置分类：
- 基础应用配置
- 数据库配置
- Redis 缓存配置
- JWT 认证配置
- 文件上传配置
- 邮件配置
- 日志配置
- 安全配置

作者: 医疗影像团队
创建时间: 2025-09-24
版本: 1.0.0
"""

import secrets
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, EmailStr, validator
try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """
    应用配置类
    
    使用 Pydantic BaseSettings 自动从环境变量读取配置。
    支持类型验证和默认值设置。
    """
    
    # ==========================================
    # 基础应用配置
    # ==========================================
    
    PROJECT_NAME: str = "医疗影像诊断系统"
    PROJECT_DESCRIPTION: str = "基于AI的医疗影像诊断系统，支持DICOM影像处理、智能诊断、报告生成等功能"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # 环境配置
    ENVIRONMENT: str = "development"  # development, staging, production
    DEBUG: bool = True
    
    # 服务器配置
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # ==========================================
    # 安全配置
    # ==========================================
    
    # JWT 配置
    SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_SECRET_KEY: str = secrets.token_urlsafe(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # 密码配置
    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_HASH_ROUNDS: int = 12
    
    # CORS 配置
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://localhost:3000",
        "http://localhost:3000/",
        "http://127.0.0.1:3000/",
        "https://localhost:3000/",
    ]
    
    @validator("BACKEND_CORS_ORIGINS", pre=True)
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> Union[List[str], str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)
    
    # 受信任主机
    ALLOWED_HOSTS: List[str] = ["localhost", "127.0.0.1", "0.0.0.0"]
    
    # ==========================================
    # 数据库配置
    # ==========================================
    
    # MySQL 配置
    DB_HOST: str = "127.0.0.1"
    DB_PORT: int = 3306
    DB_USER: str = "root"
    DB_PASSWORD: str = "123456"
    DB_NAME: str = "xiehe_medical"
    
    # 数据库连接池配置
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 3600
    
    @property
    def DATABASE_URL(self) -> str:
        """构建数据库连接 URL"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
    
    @property
    def ASYNC_DATABASE_URL(self) -> str:
        """构建异步数据库连接 URL"""
        return f"mysql+aiomysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
    
    # 测试数据库配置
    TEST_DB_NAME: str = "medical_imaging_system_test"
    
    @property
    def TEST_DATABASE_URL(self) -> str:
        """构建测试数据库连接 URL"""
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.TEST_DB_NAME}?charset=utf8mb4"
    
    # ==========================================
    # Redis 配置
    # ==========================================
    
    REDIS_HOST: str = "127.0.0.1"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: Optional[str] = None
    REDIS_DB: int = 0
    REDIS_TIMEOUT: int = 5
    
    @property
    def REDIS_URL(self) -> str:
        """构建 Redis 连接 URL"""
        if self.REDIS_PASSWORD:
            return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
        return f"redis://{self.REDIS_HOST}:{self.REDIS_PORT}/{self.REDIS_DB}"
    
    # ==========================================
    # 文件上传配置
    # ==========================================
    
    # 上传目录
    UPLOAD_DIR: str = "./uploads"
    TEMP_DIR: str = "./temp"
    
    # 文件大小限制 (字节)
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100MB
    MAX_IMAGE_SIZE: int = 50 * 1024 * 1024   # 50MB
    
    # 允许的文件类型
    ALLOWED_IMAGE_TYPES: List[str] = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".dcm", ".dicom"]
    ALLOWED_DOCUMENT_TYPES: List[str] = [".pdf", ".doc", ".docx", ".txt"]
    
    # ==========================================
    # 邮件配置
    # ==========================================
    
    # SMTP 配置
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    
    # 邮件发送配置
    FROM_EMAIL: Optional[EmailStr] = None
    FROM_NAME: str = "医疗影像诊断系统"
    
    # ==========================================
    # 日志配置
    # ==========================================
    
    # 日志级别
    LOG_LEVEL: str = "INFO"
    
    # 日志文件配置
    LOG_FILE: str = "./logs/app.log"
    LOG_MAX_SIZE: str = "10MB"
    LOG_BACKUP_COUNT: int = 5
    
    # ==========================================
    # AI 模型配置
    # ==========================================
    
    # 模型服务配置
    AI_MODEL_SERVICE_URL: str = "http://localhost:8001"
    AI_MODEL_TIMEOUT: int = 30
    AI_MODEL_MAX_RETRIES: int = 3
    
    # 模型文件路径
    AI_MODELS_DIR: str = "./models"
    DEFAULT_MODEL_NAME: str = "medical_diagnosis_v1.0"
    
    # ==========================================
    # 缓存配置
    # ==========================================
    
    # 缓存过期时间 (秒)
    CACHE_EXPIRE_TIME: int = 3600  # 1小时
    SESSION_EXPIRE_TIME: int = 86400  # 24小时
    
    # ==========================================
    # 监控配置
    # ==========================================
    
    # 性能监控
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    # 健康检查
    HEALTH_CHECK_INTERVAL: int = 30
    HEALTH_CHECK_TIMEOUT: int = 10
    
    # ==========================================
    # 第三方服务配置
    # ==========================================
    
    # Sentry 错误追踪
    SENTRY_DSN: Optional[str] = None
    
    # 云存储配置 (可选)
    CLOUD_STORAGE_TYPE: Optional[str] = None  # aws_s3, aliyun_oss, qcloud_cos
    CLOUD_STORAGE_BUCKET: Optional[str] = None
    CLOUD_STORAGE_ACCESS_KEY: Optional[str] = None
    CLOUD_STORAGE_SECRET_KEY: Optional[str] = None
    CLOUD_STORAGE_REGION: Optional[str] = None
    
    # ==========================================
    # 开发配置
    # ==========================================
    
    # 开发模式配置
    DEVELOPMENT_MODE: bool = True
    DEBUG_SQL: bool = False
    ENABLE_PROFILING: bool = False
    
    # 测试配置
    RUN_MIGRATIONS: bool = True
    
    class Config:
        """Pydantic 配置"""
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 创建全局配置实例
settings = Settings()
