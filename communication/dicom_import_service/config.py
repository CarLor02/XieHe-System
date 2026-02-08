"""
DICOM导入服务配置

作者: XieHe Medical System
创建时间: 2026-02-08
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """服务配置"""
    
    # 服务配置
    HOST: str = "0.0.0.0"
    PORT: int = 8001
    DEBUG: bool = True
    
    # XieHe后端API配置
    BACKEND_URL: str = "http://localhost:8000"
    API_TOKEN: str = ""  # 需要配置有效的API token
    
    # DICOM处理配置
    DICOM_SOURCE_PATH: str = "/data/dicom"  # 默认DICOM源目录
    OUTPUT_DIR: str = "./output"  # JPG输出目录
    JPG_QUALITY: int = 95  # JPG质量（0-100）
    
    # 窗宽窗位配置（用于DICOM转JPG）
    DEFAULT_WINDOW_CENTER: int = 40
    DEFAULT_WINDOW_WIDTH: int = 400
    
    # 去重配置
    ENABLE_DEDUPLICATION: bool = True  # 是否启用去重
    
    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: str = "./logs/dicom_import.log"
    
    # 性能配置
    MAX_WORKERS: int = 4  # 并发处理数（暂未使用）
    BATCH_SIZE: int = 10  # 批量处理大小（暂未使用）
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# 创建全局配置实例
settings = Settings()

# 确保输出目录存在
Path(settings.OUTPUT_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.LOG_FILE).parent.mkdir(parents=True, exist_ok=True)

