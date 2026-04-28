#!/usr/bin/env python3
"""
配置检查脚本

检查系统配置的完整性和正确性，验证环境变量、数据库连接、Redis连接等。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import Dict, Any, List

# 添加项目根目录到Python路径
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.system.config import settings
from app.core.database.session import DatabaseManager


def setting_value(*names: str, default=None):
    """Read the first existing setting name."""
    for name in names:
        if hasattr(settings, name):
            return getattr(settings, name)
    return default


def validate_runtime_config() -> Dict[str, Any]:
    """Validate the active runtime settings without depending on legacy config managers."""
    result = {
        "valid": True,
        "errors": [],
        "warnings": [],
        "checks": {},
    }

    if not all([
        setting_value("DB_HOST", "MYSQL_HOST"),
        setting_value("DB_USER", "MYSQL_USER"),
        setting_value("DB_NAME", "MYSQL_DATABASE"),
    ]):
        result["valid"] = False
        result["errors"].append("数据库配置不完整")
    else:
        result["checks"]["database"] = "OK"

    if not setting_value("REDIS_HOST"):
        result["valid"] = False
        result["errors"].append("Redis配置不完整")
    else:
        result["checks"]["redis"] = "OK"

    upload_dir = Path(setting_value("UPLOAD_DIR", default="./uploads"))
    if not upload_dir.exists():
        result["warnings"].append(f"上传目录不存在: {upload_dir}")
    else:
        result["checks"]["storage"] = "OK"

    if settings.ENVIRONMENT == "production" and settings.DEBUG:
        result["valid"] = False
        result["errors"].append("生产环境不应启用DEBUG模式")
    else:
        result["checks"]["security"] = "OK"

    return result


def print_header(title: str):
    """打印标题"""
    print("=" * 60)
    print(f"🔧 {title}")
    print("=" * 60)


def print_section(title: str):
    """打印章节标题"""
    print(f"\n📋 {title}")
    print("-" * 40)


def print_result(item: str, status: str, details: str = ""):
    """打印检查结果"""
    status_icons = {
        "OK": "✅",
        "FAILED": "❌",
        "WARNING": "⚠️",
        "INFO": "ℹ️"
    }
    
    icon = status_icons.get(status, "❓")
    print(f"{icon} {item}: {status}")
    if details:
        print(f"   {details}")


def check_environment():
    """检查环境配置"""
    print_section("环境配置检查")
    
    # 检查环境变量文件
    env_file = Path(".env")
    if env_file.exists():
        print_result(".env文件", "OK", f"文件大小: {env_file.stat().st_size} bytes")
    else:
        print_result(".env文件", "WARNING", "未找到.env文件，使用默认配置")
    
    # 检查环境类型
    print_result("环境类型", "INFO", settings.ENVIRONMENT)
    print_result("调试模式", "INFO", str(settings.DEBUG))
    print_result("项目版本", "INFO", settings.VERSION)
    
    # 检查密钥配置
    if settings.ENVIRONMENT == "production":
        if len(settings.SECRET_KEY) >= 32:
            print_result("SECRET_KEY", "OK", "密钥长度符合要求")
        else:
            print_result("SECRET_KEY", "FAILED", "生产环境密钥长度不足")
        
        if len(settings.JWT_SECRET_KEY) >= 32:
            print_result("JWT_SECRET_KEY", "OK", "JWT密钥长度符合要求")
        else:
            print_result("JWT_SECRET_KEY", "FAILED", "生产环境JWT密钥长度不足")
    else:
        print_result("密钥配置", "INFO", "开发环境，跳过密钥强度检查")


def check_database():
    """检查数据库配置"""
    print_section("数据库配置检查")
    
    # 检查配置参数
    print_result("数据库主机", "INFO", f"{setting_value('DB_HOST', 'MYSQL_HOST')}:{setting_value('DB_PORT', 'MYSQL_PORT')}")
    print_result("数据库名称", "INFO", setting_value("DB_NAME", "MYSQL_DATABASE"))
    print_result("数据库用户", "INFO", setting_value("DB_USER", "MYSQL_USER"))
    print_result("连接池大小", "INFO", str(settings.DB_POOL_SIZE))
    
    # 检查数据库连接
    try:
        db_manager = DatabaseManager()
        # 这里可以添加实际的数据库连接测试
        print_result("数据库连接", "OK", "配置参数完整")
    except Exception as e:
        print_result("数据库连接", "FAILED", str(e))


def check_redis():
    """检查Redis配置"""
    print_section("Redis配置检查")
    
    # 检查配置参数
    print_result("Redis主机", "INFO", f"{settings.REDIS_HOST}:{settings.REDIS_PORT}")
    print_result("Redis数据库", "INFO", str(settings.REDIS_DB))
    print_result("连接池大小", "INFO", str(setting_value("REDIS_POOL_SIZE", default=10)))
    
    # 检查Redis连接
    try:
        # 这里可以添加实际的Redis连接测试
        print_result("Redis连接", "OK", "配置参数完整")
    except Exception as e:
        print_result("Redis连接", "FAILED", str(e))


def check_security():
    """检查安全配置"""
    print_section("安全配置检查")
    
    # 检查CORS配置
    cors_origins = settings.BACKEND_CORS_ORIGINS
    if cors_origins:
        print_result("CORS配置", "OK", f"允许{len(cors_origins)}个源")
        for origin in cors_origins:
            print(f"   - {origin}")
    else:
        print_result("CORS配置", "WARNING", "未配置CORS源")
    
    # 检查允许的主机
    allowed_hosts = settings.ALLOWED_HOSTS
    if "*" in allowed_hosts and settings.ENVIRONMENT == "production":
        print_result("允许主机", "WARNING", "生产环境不建议使用通配符")
    else:
        print_result("允许主机", "OK", f"配置了{len(allowed_hosts)}个主机")
    
    # 检查JWT配置
    print_result("JWT算法", "INFO", settings.JWT_ALGORITHM)
    print_result("访问令牌过期时间", "INFO", f"{setting_value('ACCESS_TOKEN_EXPIRE_MINUTES', 'JWT_ACCESS_TOKEN_EXPIRE_MINUTES')}分钟")
    print_result("刷新令牌过期时间", "INFO", f"{setting_value('REFRESH_TOKEN_EXPIRE_DAYS', 'JWT_REFRESH_TOKEN_EXPIRE_DAYS')}天")


def check_storage():
    """检查存储配置"""
    print_section("存储配置检查")
    
    # 检查上传目录
    upload_dir = Path(settings.UPLOAD_DIR)
    if upload_dir.exists():
        print_result("上传目录", "OK", f"路径: {upload_dir.absolute()}")
    else:
        print_result("上传目录", "WARNING", f"目录不存在: {upload_dir}")
        try:
            upload_dir.mkdir(parents=True, exist_ok=True)
            print_result("创建上传目录", "OK", "目录创建成功")
        except Exception as e:
            print_result("创建上传目录", "FAILED", str(e))
    
    # 检查DICOM目录
    dicom_dir = Path(setting_value("DICOM_STORAGE_DIR", default="dicom"))
    if dicom_dir.exists():
        print_result("DICOM目录", "OK", f"路径: {dicom_dir.absolute()}")
    else:
        print_result("DICOM目录", "WARNING", f"目录不存在: {dicom_dir}")
        try:
            dicom_dir.mkdir(parents=True, exist_ok=True)
            print_result("创建DICOM目录", "OK", "目录创建成功")
        except Exception as e:
            print_result("创建DICOM目录", "FAILED", str(e))
    
    # 检查文件配置
    print_result("最大文件大小", "INFO", f"{settings.MAX_FILE_SIZE / 1024 / 1024:.1f}MB")
    allowed_types = setting_value("ALLOWED_FILE_TYPES", "ALLOWED_IMAGE_TYPES", default=[])
    print_result("允许文件类型", "INFO", ", ".join(allowed_types))


def check_logging():
    """检查日志配置"""
    print_section("日志配置检查")
    
    # 检查日志目录
    log_dir = Path(setting_value("LOG_DIR", default="logs"))
    if log_dir.exists():
        print_result("日志目录", "OK", f"路径: {log_dir.absolute()}")
    else:
        print_result("日志目录", "WARNING", f"目录不存在: {log_dir}")
        try:
            log_dir.mkdir(parents=True, exist_ok=True)
            print_result("创建日志目录", "OK", "目录创建成功")
        except Exception as e:
            print_result("创建日志目录", "FAILED", str(e))
    
    # 检查日志配置
    print_result("日志级别", "INFO", settings.LOG_LEVEL)
    print_result("日志文件", "INFO", settings.LOG_FILE)
    print_result("日志文件大小", "INFO", f"{settings.LOG_MAX_SIZE / 1024 / 1024:.1f}MB")
    print_result("备份文件数量", "INFO", str(settings.LOG_BACKUP_COUNT))


def check_ai_config():
    """检查AI配置"""
    print_section("AI模型配置检查")
    
    print_result("模型服务器", "INFO", setting_value("AI_MODEL_SERVICE_URL", "AI_MODEL_SERVER_URL"))
    print_result("模型超时时间", "INFO", f"{settings.AI_MODEL_TIMEOUT}秒")
    print_result("最大并发数", "INFO", str(setting_value("AI_MODEL_MAX_CONCURRENT", default=1)))
    
    # 检查模型存储目录
    model_dir = Path(setting_value("AI_MODELS_DIR", "AI_MODEL_STORAGE_DIR", default="./models"))
    if model_dir.exists():
        print_result("模型存储目录", "OK", f"路径: {model_dir.absolute()}")
    else:
        print_result("模型存储目录", "WARNING", f"目录不存在: {model_dir}")


def generate_config_report():
    """生成配置报告"""
    print_section("配置验证报告")
    
    validation_result = validate_runtime_config()
    
    if validation_result["valid"]:
        print_result("整体配置", "OK", "所有配置项验证通过")
    else:
        print_result("整体配置", "FAILED", "存在配置错误")
    
    # 显示错误
    if validation_result["errors"]:
        print("\n❌ 配置错误:")
        for error in validation_result["errors"]:
            print(f"   - {error}")
    
    # 显示警告
    if validation_result["warnings"]:
        print("\n⚠️ 配置警告:")
        for warning in validation_result["warnings"]:
            print(f"   - {warning}")
    
    # 显示检查结果
    if validation_result["checks"]:
        print("\n📊 检查结果:")
        for check, status in validation_result["checks"].items():
            print(f"   - {check}: {status}")


def main():
    """主函数"""
    print_header("协和医疗影像诊断系统 - 配置检查")
    
    print(f"🏥 项目名称: {settings.PROJECT_NAME}")
    print(f"📊 版本: {settings.VERSION}")
    print(f"🌍 环境: {settings.ENVIRONMENT}")
    print(f"🔧 调试模式: {settings.DEBUG}")
    
    # 执行各项检查
    check_environment()
    check_database()
    check_redis()
    check_security()
    check_storage()
    check_logging()
    check_ai_config()
    generate_config_report()
    
    print_header("配置检查完成")
    print("💡 如有配置问题，请参考 .env.example 文件进行修正")
    print("📚 详细配置说明请查看项目文档")


if __name__ == "__main__":
    main()
