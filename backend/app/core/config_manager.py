"""
配置管理器

提供配置的动态加载、验证、更新和监控功能。
支持配置文件热重载和环境变量动态更新。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import os
import json
import yaml
from typing import Any, Dict, Optional, Union
from pathlib import Path
from datetime import datetime
import logging

from .settings import settings, reload_settings

logger = logging.getLogger("app.config")


class ConfigManager:
    """
    配置管理器
    
    提供配置的加载、验证、更新和监控功能。
    """
    
    def __init__(self):
        self.config_files = {}
        self.last_modified = {}
        self.watchers = []
    
    def load_config_file(self, file_path: Union[str, Path], format: str = "auto") -> Dict[str, Any]:
        """
        加载配置文件
        
        Args:
            file_path: 配置文件路径
            format: 文件格式 (json, yaml, auto)
            
        Returns:
            配置字典
        """
        file_path = Path(file_path)
        
        if not file_path.exists():
            logger.warning(f"配置文件不存在: {file_path}")
            return {}
        
        # 自动检测文件格式
        if format == "auto":
            suffix = file_path.suffix.lower()
            if suffix in [".json"]:
                format = "json"
            elif suffix in [".yaml", ".yml"]:
                format = "yaml"
            else:
                logger.error(f"不支持的配置文件格式: {suffix}")
                return {}
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                if format == "json":
                    config = json.load(f)
                elif format == "yaml":
                    config = yaml.safe_load(f)
                else:
                    logger.error(f"不支持的配置格式: {format}")
                    return {}
            
            # 记录文件信息
            self.config_files[str(file_path)] = config
            self.last_modified[str(file_path)] = file_path.stat().st_mtime
            
            logger.info(f"成功加载配置文件: {file_path}")
            return config
            
        except Exception as e:
            logger.error(f"加载配置文件失败 {file_path}: {e}")
            return {}
    
    def save_config_file(self, config: Dict[str, Any], file_path: Union[str, Path], format: str = "json") -> bool:
        """
        保存配置文件
        
        Args:
            config: 配置字典
            file_path: 保存路径
            format: 文件格式
            
        Returns:
            是否保存成功
        """
        file_path = Path(file_path)
        
        try:
            # 确保目录存在
            file_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                if format == "json":
                    json.dump(config, f, indent=2, ensure_ascii=False)
                elif format == "yaml":
                    yaml.dump(config, f, default_flow_style=False, allow_unicode=True)
                else:
                    logger.error(f"不支持的保存格式: {format}")
                    return False
            
            logger.info(f"成功保存配置文件: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"保存配置文件失败 {file_path}: {e}")
            return False
    
    def check_file_changes(self) -> Dict[str, bool]:
        """
        检查配置文件是否有变更
        
        Returns:
            文件变更状态字典
        """
        changes = {}
        
        for file_path, last_mtime in self.last_modified.items():
            try:
                current_mtime = Path(file_path).stat().st_mtime
                changes[file_path] = current_mtime > last_mtime
                
                if changes[file_path]:
                    logger.info(f"检测到配置文件变更: {file_path}")
                    
            except FileNotFoundError:
                logger.warning(f"配置文件已删除: {file_path}")
                changes[file_path] = True
            except Exception as e:
                logger.error(f"检查文件变更失败 {file_path}: {e}")
                changes[file_path] = False
        
        return changes
    
    def reload_changed_files(self) -> bool:
        """
        重新加载已变更的配置文件
        
        Returns:
            是否有文件被重新加载
        """
        changes = self.check_file_changes()
        reloaded = False
        
        for file_path, changed in changes.items():
            if changed:
                self.load_config_file(file_path)
                reloaded = True
        
        if reloaded:
            # 重新加载应用配置
            reload_settings()
            logger.info("配置已重新加载")
        
        return reloaded
    
    def get_config_info(self) -> Dict[str, Any]:
        """
        获取配置信息
        
        Returns:
            配置信息字典
        """
        return {
            "environment": settings.ENVIRONMENT,
            "debug": settings.DEBUG,
            "version": settings.VERSION,
            "config_files": list(self.config_files.keys()),
            "last_reload": datetime.now().isoformat(),
            "database": {
                "host": settings.MYSQL_HOST,
                "port": settings.MYSQL_PORT,
                "database": settings.MYSQL_DATABASE,
                "pool_size": settings.DB_POOL_SIZE
            },
            "redis": {
                "host": settings.REDIS_HOST,
                "port": settings.REDIS_PORT,
                "db": settings.REDIS_DB
            },
            "security": {
                "jwt_algorithm": settings.JWT_ALGORITHM,
                "access_token_expire": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES,
                "password_hash_rounds": settings.PASSWORD_HASH_ROUNDS
            },
            "storage": {
                "upload_dir": settings.UPLOAD_DIR,
                "max_file_size": settings.MAX_FILE_SIZE,
                "allowed_types": settings.ALLOWED_FILE_TYPES
            }
        }
    
    def validate_config(self) -> Dict[str, Any]:
        """
        验证当前配置
        
        Returns:
            验证结果
        """
        validation_result = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "checks": {}
        }
        
        # 检查数据库配置
        try:
            if not all([settings.MYSQL_HOST, settings.MYSQL_USER, settings.MYSQL_DATABASE]):
                validation_result["errors"].append("数据库配置不完整")
                validation_result["valid"] = False
            else:
                validation_result["checks"]["database"] = "OK"
        except Exception as e:
            validation_result["errors"].append(f"数据库配置验证失败: {e}")
            validation_result["valid"] = False
        
        # 检查Redis配置
        try:
            if not settings.REDIS_HOST:
                validation_result["errors"].append("Redis配置不完整")
                validation_result["valid"] = False
            else:
                validation_result["checks"]["redis"] = "OK"
        except Exception as e:
            validation_result["errors"].append(f"Redis配置验证失败: {e}")
            validation_result["valid"] = False
        
        # 检查安全配置
        if settings.ENVIRONMENT == "production":
            if settings.DEBUG:
                validation_result["errors"].append("生产环境不应启用DEBUG模式")
                validation_result["valid"] = False
            
            if len(settings.SECRET_KEY) < 32:
                validation_result["errors"].append("生产环境密钥长度不足")
                validation_result["valid"] = False
            
            validation_result["checks"]["security"] = "OK" if validation_result["valid"] else "FAILED"
        else:
            validation_result["checks"]["security"] = "SKIP (非生产环境)"
        
        # 检查文件存储配置
        try:
            upload_dir = Path(settings.UPLOAD_DIR)
            if not upload_dir.exists():
                validation_result["warnings"].append(f"上传目录不存在: {upload_dir}")
            else:
                validation_result["checks"]["storage"] = "OK"
        except Exception as e:
            validation_result["warnings"].append(f"存储配置检查失败: {e}")
        
        return validation_result
    
    def export_config(self, include_sensitive: bool = False) -> Dict[str, Any]:
        """
        导出配置
        
        Args:
            include_sensitive: 是否包含敏感信息
            
        Returns:
            配置字典
        """
        config = self.get_config_info()
        
        if not include_sensitive:
            # 移除敏感信息
            sensitive_keys = [
                "SECRET_KEY", "JWT_SECRET_KEY", "MYSQL_PASSWORD", 
                "REDIS_PASSWORD", "SMTP_PASSWORD"
            ]
            
            def remove_sensitive(obj, keys):
                if isinstance(obj, dict):
                    return {
                        k: "***HIDDEN***" if k in keys else remove_sensitive(v, keys)
                        for k, v in obj.items()
                    }
                return obj
            
            config = remove_sensitive(config, sensitive_keys)
        
        return config
    
    def update_runtime_config(self, updates: Dict[str, Any]) -> bool:
        """
        更新运行时配置
        
        Args:
            updates: 配置更新字典
            
        Returns:
            是否更新成功
        """
        try:
            for key, value in updates.items():
                if hasattr(settings, key):
                    setattr(settings, key, value)
                    logger.info(f"更新配置: {key} = {value}")
                else:
                    logger.warning(f"未知配置项: {key}")
            
            return True
            
        except Exception as e:
            logger.error(f"更新运行时配置失败: {e}")
            return False


# 创建全局配置管理器实例
config_manager = ConfigManager()


def get_config_manager() -> ConfigManager:
    """获取配置管理器实例"""
    return config_manager


# 导出
__all__ = ["ConfigManager", "config_manager", "get_config_manager"]
