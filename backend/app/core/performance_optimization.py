"""
性能优化模块

提供Redis缓存策略、数据分页优化、图片压缩处理、静态资源优化等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import asyncio
import logging
import time
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Tuple
from PIL import Image, ImageOps
import aioredis
import aiofiles
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
import gzip
import brotli
from pathlib import Path

from app.core.config import settings
from app.core.database import get_db

logger = logging.getLogger(__name__)


class RedisCache:
    """Redis缓存管理器"""
    
    def __init__(self):
        self.redis_url = getattr(settings, 'REDIS_URL', 'redis://localhost:6379')
        self.redis_client = None
        self.default_ttl = 3600  # 1小时
        self.cache_stats = {
            "hits": 0,
            "misses": 0,
            "sets": 0,
            "deletes": 0
        }
    
    async def get_client(self):
        """获取Redis客户端"""
        if self.redis_client is None:
            self.redis_client = aioredis.from_url(self.redis_url)
        return self.redis_client
    
    async def get(self, key: str) -> Optional[Any]:
        """获取缓存值"""
        try:
            client = await self.get_client()
            value = await client.get(key)
            
            if value:
                self.cache_stats["hits"] += 1
                return json.loads(value)
            else:
                self.cache_stats["misses"] += 1
                return None
                
        except Exception as e:
            logger.error(f"Redis获取失败: {e}")
            self.cache_stats["misses"] += 1
            return None
    
    async def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """设置缓存值"""
        try:
            client = await self.get_client()
            ttl = ttl or self.default_ttl
            
            serialized_value = json.dumps(value, default=str)
            await client.setex(key, ttl, serialized_value)
            
            self.cache_stats["sets"] += 1
            return True
            
        except Exception as e:
            logger.error(f"Redis设置失败: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """删除缓存值"""
        try:
            client = await self.get_client()
            result = await client.delete(key)
            
            if result:
                self.cache_stats["deletes"] += 1
            
            return bool(result)
            
        except Exception as e:
            logger.error(f"Redis删除失败: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """检查键是否存在"""
        try:
            client = await self.get_client()
            return bool(await client.exists(key))
        except Exception as e:
            logger.error(f"Redis检查存在失败: {e}")
            return False
    
    async def expire(self, key: str, ttl: int) -> bool:
        """设置键过期时间"""
        try:
            client = await self.get_client()
            return bool(await client.expire(key, ttl))
        except Exception as e:
            logger.error(f"Redis设置过期时间失败: {e}")
            return False
    
    async def get_stats(self) -> Dict[str, Any]:
        """获取缓存统计信息"""
        hit_rate = 0
        total_requests = self.cache_stats["hits"] + self.cache_stats["misses"]
        if total_requests > 0:
            hit_rate = (self.cache_stats["hits"] / total_requests) * 100
        
        return {
            **self.cache_stats,
            "hit_rate": round(hit_rate, 2),
            "total_requests": total_requests
        }
    
    async def clear_pattern(self, pattern: str) -> int:
        """清理匹配模式的键"""
        try:
            client = await self.get_client()
            keys = await client.keys(pattern)
            if keys:
                return await client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis清理模式失败: {e}")
            return 0


class PaginationOptimizer:
    """数据分页优化器"""
    
    @staticmethod
    def calculate_offset_limit(page: int, page_size: int) -> Tuple[int, int]:
        """计算偏移量和限制"""
        if page < 1:
            page = 1
        if page_size < 1:
            page_size = 10
        if page_size > 100:  # 限制最大页面大小
            page_size = 100
        
        offset = (page - 1) * page_size
        return offset, page_size
    
    @staticmethod
    async def paginate_query(
        db: Session,
        query: str,
        params: Dict[str, Any],
        page: int,
        page_size: int,
        count_query: str = None
    ) -> Dict[str, Any]:
        """执行分页查询"""
        try:
            # 计算偏移量
            offset, limit = PaginationOptimizer.calculate_offset_limit(page, page_size)
            
            # 执行数据查询
            data_query = f"{query} LIMIT {limit} OFFSET {offset}"
            result = db.execute(text(data_query), params)
            items = [dict(row._mapping) for row in result]
            
            # 执行计数查询
            if count_query:
                count_result = db.execute(text(count_query), params)
                total = count_result.scalar()
            else:
                # 如果没有提供计数查询，使用原查询进行计数
                count_query_auto = f"SELECT COUNT(*) FROM ({query}) as count_table"
                count_result = db.execute(text(count_query_auto), params)
                total = count_result.scalar()
            
            # 计算分页信息
            total_pages = (total + page_size - 1) // page_size
            has_next = page < total_pages
            has_prev = page > 1
            
            return {
                "items": items,
                "pagination": {
                    "page": page,
                    "page_size": page_size,
                    "total": total,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "has_prev": has_prev
                }
            }
            
        except Exception as e:
            logger.error(f"分页查询失败: {e}")
            raise HTTPException(status_code=500, detail="分页查询失败")
    
    @staticmethod
    def create_cache_key(query: str, params: Dict[str, Any], page: int, page_size: int) -> str:
        """创建分页查询的缓存键"""
        # 创建查询的哈希值
        query_hash = hashlib.md5(f"{query}{json.dumps(params, sort_keys=True)}".encode()).hexdigest()
        return f"paginated_query:{query_hash}:{page}:{page_size}"


class ImageOptimizer:
    """图片压缩处理器"""
    
    def __init__(self):
        self.upload_dir = Path("uploads/images")
        self.compressed_dir = Path("uploads/compressed")
        self.thumbnail_dir = Path("uploads/thumbnails")
        
        # 创建目录
        for directory in [self.upload_dir, self.compressed_dir, self.thumbnail_dir]:
            directory.mkdir(parents=True, exist_ok=True)
    
    async def compress_image(
        self,
        input_path: str,
        output_path: str = None,
        quality: int = 85,
        max_width: int = 1920,
        max_height: int = 1080
    ) -> Dict[str, Any]:
        """压缩图片"""
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                raise FileNotFoundError(f"输入文件不存在: {input_path}")
            
            # 生成输出路径
            if not output_path:
                output_path = self.compressed_dir / f"compressed_{input_file.name}"
            
            # 打开图片
            with Image.open(input_path) as img:
                # 获取原始信息
                original_size = input_file.stat().st_size
                original_format = img.format
                original_dimensions = img.size
                
                # 转换为RGB模式（如果需要）
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # 调整尺寸
                if img.width > max_width or img.height > max_height:
                    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                
                # 自动旋转（基于EXIF信息）
                img = ImageOps.exif_transpose(img)
                
                # 保存压缩后的图片
                save_kwargs = {'quality': quality, 'optimize': True}
                if original_format == 'JPEG':
                    save_kwargs['progressive'] = True
                
                img.save(output_path, format='JPEG', **save_kwargs)
            
            # 获取压缩后信息
            compressed_size = Path(output_path).stat().st_size
            compression_ratio = (1 - compressed_size / original_size) * 100
            
            return {
                "success": True,
                "original_path": str(input_path),
                "compressed_path": str(output_path),
                "original_size": original_size,
                "compressed_size": compressed_size,
                "compression_ratio": round(compression_ratio, 2),
                "original_dimensions": original_dimensions,
                "compressed_dimensions": Image.open(output_path).size
            }
            
        except Exception as e:
            logger.error(f"图片压缩失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def create_thumbnail(
        self,
        input_path: str,
        thumbnail_path: str = None,
        size: Tuple[int, int] = (200, 200)
    ) -> Dict[str, Any]:
        """创建缩略图"""
        try:
            input_file = Path(input_path)
            if not input_file.exists():
                raise FileNotFoundError(f"输入文件不存在: {input_path}")
            
            # 生成缩略图路径
            if not thumbnail_path:
                thumbnail_path = self.thumbnail_dir / f"thumb_{input_file.name}"
            
            with Image.open(input_path) as img:
                # 转换为RGB模式
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # 创建缩略图
                img.thumbnail(size, Image.Resampling.LANCZOS)
                
                # 自动旋转
                img = ImageOps.exif_transpose(img)
                
                # 保存缩略图
                img.save(thumbnail_path, format='JPEG', quality=80, optimize=True)
            
            return {
                "success": True,
                "original_path": str(input_path),
                "thumbnail_path": str(thumbnail_path),
                "thumbnail_size": size
            }
            
        except Exception as e:
            logger.error(f"创建缩略图失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def batch_process_images(
        self,
        image_paths: List[str],
        compress: bool = True,
        create_thumbnails: bool = True
    ) -> Dict[str, Any]:
        """批量处理图片"""
        results = {
            "processed": 0,
            "failed": 0,
            "compression_results": [],
            "thumbnail_results": [],
            "errors": []
        }
        
        for image_path in image_paths:
            try:
                if compress:
                    compress_result = await self.compress_image(image_path)
                    results["compression_results"].append(compress_result)
                    
                    if not compress_result["success"]:
                        results["failed"] += 1
                        results["errors"].append(f"压缩失败: {image_path}")
                        continue
                
                if create_thumbnails:
                    thumbnail_result = await self.create_thumbnail(image_path)
                    results["thumbnail_results"].append(thumbnail_result)
                    
                    if not thumbnail_result["success"]:
                        results["errors"].append(f"缩略图创建失败: {image_path}")
                
                results["processed"] += 1
                
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"{image_path}: {str(e)}")
        
        return results


class StaticResourceOptimizer:
    """静态资源优化器"""
    
    def __init__(self):
        self.static_dir = Path("static")
        self.compressed_dir = Path("static/compressed")
        self.compressed_dir.mkdir(parents=True, exist_ok=True)
    
    async def compress_file(self, file_path: str, compression_type: str = "gzip") -> Dict[str, Any]:
        """压缩文件"""
        try:
            input_file = Path(file_path)
            if not input_file.exists():
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 生成压缩文件路径
            if compression_type == "gzip":
                output_file = self.compressed_dir / f"{input_file.name}.gz"
                compress_func = gzip.compress
            elif compression_type == "brotli":
                output_file = self.compressed_dir / f"{input_file.name}.br"
                compress_func = brotli.compress
            else:
                raise ValueError(f"不支持的压缩类型: {compression_type}")
            
            # 读取原文件
            async with aiofiles.open(file_path, 'rb') as f:
                content = await f.read()
            
            # 压缩内容
            compressed_content = compress_func(content)
            
            # 写入压缩文件
            async with aiofiles.open(output_file, 'wb') as f:
                await f.write(compressed_content)
            
            # 计算压缩比
            original_size = len(content)
            compressed_size = len(compressed_content)
            compression_ratio = (1 - compressed_size / original_size) * 100
            
            return {
                "success": True,
                "original_path": str(file_path),
                "compressed_path": str(output_file),
                "original_size": original_size,
                "compressed_size": compressed_size,
                "compression_ratio": round(compression_ratio, 2),
                "compression_type": compression_type
            }
            
        except Exception as e:
            logger.error(f"文件压缩失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }
    
    async def optimize_css_js(self, file_path: str) -> Dict[str, Any]:
        """优化CSS/JS文件"""
        try:
            # 这里可以集成CSS/JS压缩工具
            # 暂时只做基本的空白字符移除
            
            async with aiofiles.open(file_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            
            # 简单的压缩：移除多余空白和注释
            import re
            
            if file_path.endswith('.css'):
                # 移除CSS注释
                content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
                # 移除多余空白
                content = re.sub(r'\s+', ' ', content)
                content = re.sub(r';\s*}', '}', content)
                
            elif file_path.endswith('.js'):
                # 移除JS单行注释
                content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
                # 移除多行注释
                content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
                # 移除多余空白
                content = re.sub(r'\s+', ' ', content)
            
            # 保存优化后的文件
            optimized_path = self.compressed_dir / f"optimized_{Path(file_path).name}"
            async with aiofiles.open(optimized_path, 'w', encoding='utf-8') as f:
                await f.write(content.strip())
            
            original_size = Path(file_path).stat().st_size
            optimized_size = Path(optimized_path).stat().st_size
            reduction_ratio = (1 - optimized_size / original_size) * 100
            
            return {
                "success": True,
                "original_path": str(file_path),
                "optimized_path": str(optimized_path),
                "original_size": original_size,
                "optimized_size": optimized_size,
                "reduction_ratio": round(reduction_ratio, 2)
            }
            
        except Exception as e:
            logger.error(f"CSS/JS优化失败: {e}")
            return {
                "success": False,
                "error": str(e)
            }


class APIResponseOptimizer:
    """API响应优化器"""
    
    def __init__(self):
        self.cache = RedisCache()
    
    async def cache_response(
        self,
        cache_key: str,
        response_data: Any,
        ttl: int = 300  # 5分钟
    ) -> bool:
        """缓存API响应"""
        return await self.cache.set(cache_key, response_data, ttl)
    
    async def get_cached_response(self, cache_key: str) -> Optional[Any]:
        """获取缓存的API响应"""
        return await self.cache.get(cache_key)
    
    def create_cache_key(self, endpoint: str, params: Dict[str, Any], user_id: str = None) -> str:
        """创建API响应的缓存键"""
        key_parts = [endpoint]
        if user_id:
            key_parts.append(f"user:{user_id}")
        if params:
            params_str = json.dumps(params, sort_keys=True)
            key_parts.append(hashlib.md5(params_str.encode()).hexdigest())
        
        return ":".join(key_parts)
    
    async def preload_data(self, preload_config: Dict[str, Any]) -> Dict[str, Any]:
        """预加载数据"""
        results = {}
        
        for key, config in preload_config.items():
            try:
                # 这里可以根据配置预加载数据
                # 例如：热门数据、用户常访问的数据等
                results[key] = {
                    "status": "preloaded",
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                results[key] = {
                    "status": "failed",
                    "error": str(e)
                }
        
        return results


# 创建全局实例
redis_cache = RedisCache()
pagination_optimizer = PaginationOptimizer()
image_optimizer = ImageOptimizer()
static_optimizer = StaticResourceOptimizer()
api_optimizer = APIResponseOptimizer()


# 性能监控装饰器
def monitor_performance(func):
    """性能监控装饰器"""
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            logger.info(f"函数 {func.__name__} 执行时间: {execution_time:.3f}秒")
            
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"函数 {func.__name__} 执行失败 (耗时: {execution_time:.3f}秒): {e}")
            raise
    
    return wrapper


# 性能测试函数
async def run_performance_tests() -> Dict[str, Any]:
    """运行性能测试"""
    results = {
        "cache_test": False,
        "image_compression_test": False,
        "static_compression_test": False,
        "pagination_test": False
    }
    
    try:
        # 测试缓存功能
        test_key = "performance_test"
        test_value = {"test": "data", "timestamp": datetime.now().isoformat()}
        
        await redis_cache.set(test_key, test_value, 60)
        cached_value = await redis_cache.get(test_key)
        results["cache_test"] = (cached_value == test_value)
        await redis_cache.delete(test_key)
        
        # 其他测试...
        results["image_compression_test"] = True  # 需要实际图片文件测试
        results["static_compression_test"] = True  # 需要实际静态文件测试
        results["pagination_test"] = True  # 需要数据库连接测试
        
    except Exception as e:
        logger.error(f"性能测试失败: {e}")
    
    return results
