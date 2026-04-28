"""
数据库连接配置模块
支持MySQL主数据库和Redis缓存的连接管理
"""

import logging
from typing import Optional, Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import redis
from redis import ConnectionPool

from app.core.system.config import settings
from app.models.base import Base

# 配置日志
logger = logging.getLogger(__name__)

# 数据库引擎配置
SYNC_DATABASE_URL = settings.DATABASE_URL

# 同步数据库引擎
sync_engine = create_engine(
    SYNC_DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    poolclass=QueuePool,
    connect_args={
        "charset": "utf8mb4",
        "autocommit": False,
        "connect_timeout": 60,
        "read_timeout": 30,
        "write_timeout": 30,
    }
)

# 会话工厂
SessionLocal = sessionmaker(
    bind=sync_engine,
    autocommit=False,
    autoflush=True
)

# Redis连接池配置
# 优先使用 REDIS_URL，如果没有则使用单独的配置项
import os
redis_url = os.getenv("REDIS_URL")
if redis_url:
    # 使用 REDIS_URL 创建连接池
    redis_pool = ConnectionPool.from_url(
        redis_url,
        encoding="utf-8",
        decode_responses=True,
        max_connections=10,
        retry_on_timeout=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        health_check_interval=30,
    )
else:
    # 使用单独的配置项
    redis_pool = ConnectionPool(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD if settings.REDIS_PASSWORD else None,
        db=settings.REDIS_DB,
        encoding="utf-8",
        decode_responses=True,
        max_connections=10,
        retry_on_timeout=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        health_check_interval=30,
    )

# Redis客户端
redis_client: Optional[redis.Redis] = None


class DatabaseManager:
    """数据库管理器"""

    def __init__(self):
        self.sync_engine = sync_engine
        self.redis_client = None

    def connect(self):
        """连接数据库和Redis"""
        try:
            # 测试MySQL连接
            with self.sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("✅ MySQL数据库连接成功")

            # 连接Redis
            self.redis_client = redis.Redis(connection_pool=redis_pool)
            self.redis_client.ping()
            logger.info("✅ Redis缓存连接成功")

            # 设置全局Redis客户端
            global redis_client
            redis_client = self.redis_client

        except Exception as e:
            logger.error(f"❌ 数据库连接失败: {e}")
            raise

    def disconnect(self):
        """断开数据库连接"""
        try:
            # 关闭同步引擎
            self.sync_engine.dispose()
            logger.info("✅ MySQL连接已关闭")

            # 关闭Redis连接
            if self.redis_client:
                self.redis_client.close()
                logger.info("✅ Redis连接已关闭")

        except Exception as e:
            logger.error(f"❌ 关闭数据库连接失败: {e}")

    def health_check(self) -> dict:
        """健康检查"""
        health_status = {
            "mysql": {"status": "unknown", "response_time": None},
            "redis": {"status": "unknown", "response_time": None}
        }

        # MySQL健康检查
        try:
            import time
            start_time = time.time()
            with self.sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            response_time = round((time.time() - start_time) * 1000, 2)
            health_status["mysql"] = {
                "status": "healthy",
                "response_time": f"{response_time}ms"
            }
        except Exception as e:
            health_status["mysql"] = {
                "status": "unhealthy",
                "error": str(e)
            }

        # Redis健康检查
        try:
            import time
            start_time = time.time()
            self.redis_client.ping()
            response_time = round((time.time() - start_time) * 1000, 2)
            health_status["redis"] = {
                "status": "healthy",
                "response_time": f"{response_time}ms"
            }
        except Exception as e:
            health_status["redis"] = {
                "status": "unhealthy",
                "error": str(e)
            }

        return health_status


# 全局数据库管理器实例
db_manager = DatabaseManager()


# 依赖注入：获取数据库会话
def get_db() -> Generator:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# 依赖注入：获取Redis客户端
def get_redis() -> redis.Redis:
    """获取Redis客户端"""
    if redis_client is None:
        raise RuntimeError("Redis客户端未初始化")
    return redis_client


# 数据库事件监听器
@event.listens_for(sync_engine, "connect")
def set_mysql_pragma(dbapi_connection, connection_record):
    """设置MySQL连接参数"""
    with dbapi_connection.cursor() as cursor:
        # 设置字符集
        cursor.execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci")
        # 设置时区
        cursor.execute("SET time_zone = '+00:00'")
        # 设置SQL模式
        cursor.execute("SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'")


@event.listens_for(sync_engine, "checkout")
def receive_checkout(dbapi_connection, connection_record, connection_proxy):
    """连接检出时的处理"""
    logger.debug("数据库连接已检出")


@event.listens_for(sync_engine, "checkin")
def receive_checkin(dbapi_connection, connection_record):
    """连接检入时的处理"""
    logger.debug("数据库连接已检入")


# 导出主要组件
__all__ = [
    "Base",
    "sync_engine",
    "SessionLocal",
    "redis_client",
    "db_manager",
    "get_db",
    "get_redis",
]
