"""
数据库连接配置模块
支持MySQL同步与异步连接管理
"""

import typing
from collections.abc import AsyncGenerator, Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import QueuePool

from app.core.config import settings
from app.core.system.logger import LogLevel, logger
from app.models.base import Base

# 配置日志

# 数据库引擎配置
SYNC_DATABASE_URL = settings.DATABASE_URL
ASYNC_DATABASE_URL = settings.ASYNC_DATABASE_URL

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
    },
)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_pre_ping=True,
    connect_args={
        "charset": "utf8mb4",
        "connect_timeout": 60,
    },
)

# 会话工厂
SessionLocal = sessionmaker(bind=sync_engine, autocommit=False, autoflush=True)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    autoflush=True,
    expire_on_commit=False,
)


class DatabaseManager:
    """MySQL database manager; Redis owns a separate application lifecycle."""

    def __init__(self) -> None:
        self.sync_engine = sync_engine

    def connect(self) -> None:
        """连接数据库"""
        try:
            # 测试MySQL连接
            with self.sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.emit_event(LogLevel.INFO, message="✅ MySQL数据库连接成功")

        except Exception as e:
            logger.emit_event(LogLevel.ERROR, message=f"❌ 数据库连接失败: {e}")
            raise

    def disconnect(self) -> None:
        """断开数据库连接"""
        try:
            # 关闭同步引擎
            self.sync_engine.dispose()
            logger.emit_event(LogLevel.INFO, message="✅ MySQL连接已关闭")

        except Exception as e:
            logger.emit_event(LogLevel.ERROR, message=f"❌ 关闭数据库连接失败: {e}")

    def health_check(self) -> dict[str, typing.Any]:
        """健康检查"""
        health_status = {"mysql": {"status": "unknown", "response_time": None}}

        # MySQL健康检查
        try:
            import time

            start_time = time.time()
            with self.sync_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            response_time = round((time.time() - start_time) * 1000, 2)
            health_status["mysql"] = {
                "status": "healthy",
                "response_time": f"{response_time}ms",
            }
        except Exception as e:
            health_status["mysql"] = {"status": "unhealthy", "error": str(e)}

        return health_status


# 全局数据库管理器实例
db_manager = DatabaseManager()


# 依赖注入：获取数据库会话
def get_db() -> Generator[Session, None, None]:
    """获取数据库会话"""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """获取异步数据库会话"""
    async with AsyncSessionLocal() as db:
        try:
            yield db
        except Exception:
            await db.rollback()
            raise


# 数据库事件监听器
@event.listens_for(sync_engine, "connect")
def set_mysql_pragma(
    dbapi_connection: typing.Any, connection_record: typing.Any
) -> None:
    """设置MySQL连接参数"""
    with dbapi_connection.cursor() as cursor:
        # 设置字符集
        cursor.execute("SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci")
        # 设置时区
        cursor.execute("SET time_zone = '+00:00'")
        # 设置SQL模式
        cursor.execute(
            "SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'"
        )


@event.listens_for(sync_engine, "checkout")
def receive_checkout(
    dbapi_connection: typing.Any,
    connection_record: typing.Any,
    connection_proxy: typing.Any,
) -> None:
    """连接检出时的处理"""
    logger.emit_event(LogLevel.DEBUG, message="数据库连接已检出")


@event.listens_for(sync_engine, "checkin")
def receive_checkin(
    dbapi_connection: typing.Any, connection_record: typing.Any
) -> None:
    """连接检入时的处理"""
    logger.emit_event(LogLevel.DEBUG, message="数据库连接已检入")


# 导出主要组件
__all__ = [
    "Base",
    "sync_engine",
    "async_engine",
    "SessionLocal",
    "AsyncSessionLocal",
    "db_manager",
    "get_db",
    "get_async_db",
]
