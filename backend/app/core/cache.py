"""
Redis缓存工具模块

提供Redis缓存的封装工具类、装饰器和常用缓存操作。
支持缓存过期、序列化、批量操作等功能。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import json
import pickle
import hashlib
import logging
from typing import Any, Optional, Union, Dict, List, Callable
from functools import wraps
from datetime import datetime, timedelta

import redis
from redis import Redis

from .database import get_redis

logger = logging.getLogger(__name__)


class CacheManager:
    """Redis缓存管理器"""
    
    def __init__(self, redis_client: Optional[Redis] = None):
        """
        初始化缓存管理器
        
        Args:
            redis_client: Redis客户端实例，如果为None则使用默认客户端
        """
        self.redis_client = redis_client or get_redis()
        self.default_ttl = 3600  # 默认过期时间1小时
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None, 
            serialize: str = "json") -> bool:
        """
        设置缓存
        
        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒），None表示不过期
            serialize: 序列化方式，支持 'json', 'pickle', 'str'
        
        Returns:
            bool: 是否设置成功
        """
        try:
            # 序列化数据
            serialized_value = self._serialize(value, serialize)
            
            # 设置缓存
            if ttl is not None:
                result = self.redis_client.setex(key, ttl, serialized_value)
            else:
                result = self.redis_client.set(key, serialized_value)
            
            logger.debug(f"缓存设置成功: {key}, TTL: {ttl}")
            return bool(result)
            
        except Exception as e:
            logger.error(f"设置缓存失败: {key}, 错误: {e}")
            return False
    
    def get(self, key: str, serialize: str = "json") -> Any:
        """
        获取缓存
        
        Args:
            key: 缓存键
            serialize: 反序列化方式，支持 'json', 'pickle', 'str'
        
        Returns:
            Any: 缓存值，不存在返回None
        """
        try:
            value = self.redis_client.get(key)
            if value is None:
                return None
            
            # 反序列化数据
            deserialized_value = self._deserialize(value, serialize)
            logger.debug(f"缓存获取成功: {key}")
            return deserialized_value
            
        except Exception as e:
            logger.error(f"获取缓存失败: {key}, 错误: {e}")
            return None
    
    def delete(self, *keys: str) -> int:
        """
        删除缓存
        
        Args:
            *keys: 要删除的缓存键
        
        Returns:
            int: 删除的键数量
        """
        try:
            result = self.redis_client.delete(*keys)
            logger.debug(f"缓存删除成功: {keys}, 删除数量: {result}")
            return result
        except Exception as e:
            logger.error(f"删除缓存失败: {keys}, 错误: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """
        检查缓存是否存在
        
        Args:
            key: 缓存键
        
        Returns:
            bool: 是否存在
        """
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"检查缓存存在性失败: {key}, 错误: {e}")
            return False
    
    def expire(self, key: str, ttl: int) -> bool:
        """
        设置缓存过期时间
        
        Args:
            key: 缓存键
            ttl: 过期时间（秒）
        
        Returns:
            bool: 是否设置成功
        """
        try:
            result = self.redis_client.expire(key, ttl)
            logger.debug(f"设置缓存过期时间: {key}, TTL: {ttl}")
            return bool(result)
        except Exception as e:
            logger.error(f"设置缓存过期时间失败: {key}, 错误: {e}")
            return False
    
    def ttl(self, key: str) -> int:
        """
        获取缓存剩余过期时间
        
        Args:
            key: 缓存键
        
        Returns:
            int: 剩余时间（秒），-1表示永不过期，-2表示不存在
        """
        try:
            return self.redis_client.ttl(key)
        except Exception as e:
            logger.error(f"获取缓存TTL失败: {key}, 错误: {e}")
            return -2
    
    def clear_pattern(self, pattern: str) -> int:
        """
        根据模式删除缓存
        
        Args:
            pattern: 匹配模式，如 'user:*'
        
        Returns:
            int: 删除的键数量
        """
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                result = self.redis_client.delete(*keys)
                logger.info(f"批量删除缓存: {pattern}, 删除数量: {result}")
                return result
            return 0
        except Exception as e:
            logger.error(f"批量删除缓存失败: {pattern}, 错误: {e}")
            return 0
    
    def mget(self, keys: List[str], serialize: str = "json") -> Dict[str, Any]:
        """
        批量获取缓存
        
        Args:
            keys: 缓存键列表
            serialize: 反序列化方式
        
        Returns:
            Dict[str, Any]: 键值对字典
        """
        try:
            values = self.redis_client.mget(keys)
            result = {}
            
            for key, value in zip(keys, values):
                if value is not None:
                    result[key] = self._deserialize(value, serialize)
                else:
                    result[key] = None
            
            logger.debug(f"批量获取缓存成功: {len(keys)}个键")
            return result
            
        except Exception as e:
            logger.error(f"批量获取缓存失败: {keys}, 错误: {e}")
            return {key: None for key in keys}
    
    def mset(self, mapping: Dict[str, Any], ttl: Optional[int] = None,
             serialize: str = "json") -> bool:
        """
        批量设置缓存
        
        Args:
            mapping: 键值对字典
            ttl: 过期时间（秒）
            serialize: 序列化方式
        
        Returns:
            bool: 是否设置成功
        """
        try:
            # 序列化所有值
            serialized_mapping = {
                key: self._serialize(value, serialize)
                for key, value in mapping.items()
            }
            
            # 批量设置
            result = self.redis_client.mset(serialized_mapping)
            
            # 如果设置了TTL，需要逐个设置过期时间
            if ttl is not None and result:
                for key in mapping.keys():
                    self.redis_client.expire(key, ttl)
            
            logger.debug(f"批量设置缓存成功: {len(mapping)}个键")
            return bool(result)
            
        except Exception as e:
            logger.error(f"批量设置缓存失败: {mapping.keys()}, 错误: {e}")
            return False
    
    def increment(self, key: str, amount: int = 1) -> Optional[int]:
        """
        递增计数器
        
        Args:
            key: 缓存键
            amount: 递增量
        
        Returns:
            Optional[int]: 递增后的值
        """
        try:
            result = self.redis_client.incrby(key, amount)
            logger.debug(f"计数器递增: {key}, 增量: {amount}, 结果: {result}")
            return result
        except Exception as e:
            logger.error(f"计数器递增失败: {key}, 错误: {e}")
            return None
    
    def decrement(self, key: str, amount: int = 1) -> Optional[int]:
        """
        递减计数器
        
        Args:
            key: 缓存键
            amount: 递减量
        
        Returns:
            Optional[int]: 递减后的值
        """
        try:
            result = self.redis_client.decrby(key, amount)
            logger.debug(f"计数器递减: {key}, 减量: {amount}, 结果: {result}")
            return result
        except Exception as e:
            logger.error(f"计数器递减失败: {key}, 错误: {e}")
            return None
    
    def _serialize(self, value: Any, method: str) -> Union[str, bytes]:
        """序列化数据"""
        if method == "json":
            return json.dumps(value, ensure_ascii=False, default=str)
        elif method == "pickle":
            return pickle.dumps(value)
        elif method == "str":
            return str(value)
        else:
            raise ValueError(f"不支持的序列化方式: {method}")
    
    def _deserialize(self, value: Union[str, bytes], method: str) -> Any:
        """反序列化数据"""
        if method == "json":
            return json.loads(value)
        elif method == "pickle":
            return pickle.loads(value)
        elif method == "str":
            return value.decode() if isinstance(value, bytes) else value
        else:
            raise ValueError(f"不支持的反序列化方式: {method}")


# 全局缓存管理器实例（延迟初始化）
cache_manager: Optional[CacheManager] = None


def get_cache_manager() -> CacheManager:
    """获取缓存管理器实例"""
    global cache_manager
    if cache_manager is None:
        cache_manager = CacheManager()
    return cache_manager


def cache_key(*args, **kwargs) -> str:
    """
    生成缓存键
    
    Args:
        *args: 位置参数
        **kwargs: 关键字参数
    
    Returns:
        str: 生成的缓存键
    """
    # 将参数转换为字符串并排序
    key_parts = []
    
    # 添加位置参数
    for arg in args:
        key_parts.append(str(arg))
    
    # 添加关键字参数（排序确保一致性）
    for key, value in sorted(kwargs.items()):
        key_parts.append(f"{key}:{value}")
    
    # 生成MD5哈希
    key_string = ":".join(key_parts)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached(ttl: int = 3600, key_prefix: str = "", serialize: str = "json"):
    """
    缓存装饰器
    
    Args:
        ttl: 缓存过期时间（秒）
        key_prefix: 缓存键前缀
        serialize: 序列化方式
    
    Returns:
        装饰器函数
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键
            func_name = f"{func.__module__}.{func.__name__}"
            cache_key_parts = [key_prefix, func_name] if key_prefix else [func_name]
            cache_key_parts.extend([str(arg) for arg in args])
            cache_key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
            
            cache_key_str = ":".join(filter(None, cache_key_parts))
            cache_key_hash = hashlib.md5(cache_key_str.encode()).hexdigest()
            
            # 尝试从缓存获取
            cache_mgr = get_cache_manager()
            cached_result = cache_mgr.get(cache_key_hash, serialize)
            if cached_result is not None:
                logger.debug(f"缓存命中: {func_name}")
                return cached_result

            # 执行函数并缓存结果
            result = func(*args, **kwargs)
            cache_mgr.set(cache_key_hash, result, ttl, serialize)
            logger.debug(f"缓存设置: {func_name}")

            return result
        
        # 添加清除缓存的方法
        def clear_cache(*args, **kwargs):
            func_name = f"{func.__module__}.{func.__name__}"
            cache_key_parts = [key_prefix, func_name] if key_prefix else [func_name]
            cache_key_parts.extend([str(arg) for arg in args])
            cache_key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
            
            cache_key_str = ":".join(filter(None, cache_key_parts))
            cache_key_hash = hashlib.md5(cache_key_str.encode()).hexdigest()
            
            return get_cache_manager().delete(cache_key_hash)
        
        wrapper.clear_cache = clear_cache
        return wrapper
    
    return decorator


# 导出
__all__ = [
    "CacheManager", "get_cache_manager", "cache_key", "cached"
]
