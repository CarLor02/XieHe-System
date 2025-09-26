"""
日志配置模块

配置应用的日志系统，支持结构化日志、多种输出格式和日志级别。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import logging
import logging.config
import sys
from pathlib import Path
from typing import Dict, Any

from app.core.config import settings


def setup_logging() -> None:
    """
    设置应用日志配置
    
    根据环境配置不同的日志级别和输出格式。
    开发环境：控制台输出，详细格式
    生产环境：文件输出，JSON格式
    """
    
    # 创建日志目录
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # 根据环境确定日志级别
    if settings.ENVIRONMENT == "development":
        log_level = "DEBUG" if settings.DEBUG else "INFO"
    elif settings.ENVIRONMENT == "staging":
        log_level = "INFO"
    else:  # production
        log_level = "WARNING"
    
    # 日志配置
    logging_config: Dict[str, Any] = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "default": {
                "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "detailed": {
                "format": (
                    "%(asctime)s - %(name)s - %(levelname)s - "
                    "%(filename)s:%(lineno)d - %(funcName)s - %(message)s"
                ),
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
            "json": {
                "()": "pythonjsonlogger.jsonlogger.JsonFormatter",
                "format": (
                    "%(asctime)s %(name)s %(levelname)s %(filename)s "
                    "%(lineno)d %(funcName)s %(message)s"
                ),
                "datefmt": "%Y-%m-%d %H:%M:%S",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "detailed" if settings.DEBUG else "default",
                "stream": sys.stdout,
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": log_level,
                "formatter": "json" if settings.ENVIRONMENT == "production" else "detailed",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8",
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "json" if settings.ENVIRONMENT == "production" else "detailed",
                "filename": "logs/error.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5,
                "encoding": "utf8",
            },
        },
        "loggers": {
            # 应用日志
            "app": {
                "level": log_level,
                "handlers": ["console", "file"],
                "propagate": False,
            },
            # FastAPI日志
            "fastapi": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            # Uvicorn日志
            "uvicorn": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "uvicorn.access": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "uvicorn.error": {
                "level": "INFO",
                "handlers": ["console", "error_file"],
                "propagate": False,
            },
            # SQLAlchemy日志
            "sqlalchemy.engine": {
                "level": "INFO" if settings.DEBUG else "WARNING",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            "sqlalchemy.pool": {
                "level": "INFO" if settings.DEBUG else "WARNING",
                "handlers": ["console", "file"],
                "propagate": False,
            },
            # Redis日志
            "redis": {
                "level": "INFO",
                "handlers": ["console", "file"],
                "propagate": False,
            },
        },
        "root": {
            "level": log_level,
            "handlers": ["console", "file"],
        },
    }
    
    # 应用日志配置
    logging.config.dictConfig(logging_config)
    
    # 设置第三方库日志级别
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("requests").setLevel(logging.WARNING)
    logging.getLogger("PIL").setLevel(logging.WARNING)
    
    # 记录启动信息
    logger = logging.getLogger("app.startup")
    logger.info("=" * 60)
    logger.info("🏥 协和医疗影像诊断系统启动")
    logger.info(f"📊 环境: {settings.ENVIRONMENT}")
    logger.info(f"🔧 调试模式: {settings.DEBUG}")
    logger.info(f"📝 日志级别: {log_level}")
    logger.info(f"📁 日志目录: {log_dir.absolute()}")
    logger.info("=" * 60)


def get_logger(name: str) -> logging.Logger:
    """
    获取指定名称的日志器
    
    Args:
        name: 日志器名称
        
    Returns:
        配置好的日志器实例
    """
    return logging.getLogger(f"app.{name}")


# 预定义的日志器
auth_logger = get_logger("auth")
db_logger = get_logger("database")
api_logger = get_logger("api")
dicom_logger = get_logger("dicom")
ai_logger = get_logger("ai")
system_logger = get_logger("system")
