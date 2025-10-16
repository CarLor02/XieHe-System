"""
数据库会话管理

提供数据库连接和会话管理功能。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import logging

from app.core.config import settings

logger = logging.getLogger("app.database")

# 创建数据库引擎
if settings.DATABASE_URL:
    # 生产环境使用配置的数据库URL
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=settings.DEBUG,
    )
else:
    # 开发环境使用默认配置
    SQLALCHEMY_DATABASE_URL = (
        f"mysql+pymysql://{settings.MYSQL_USER}:{settings.MYSQL_PASSWORD}"
        f"@{settings.MYSQL_HOST}:{settings.MYSQL_PORT}/{settings.MYSQL_DATABASE}"
    )
    
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=settings.DEBUG,
    )

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建基础模型类
Base = declarative_base()


def get_db():
    """
    获取数据库会话
    
    用于FastAPI依赖注入的数据库会话生成器。
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"数据库会话错误: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def init_db():
    """
    初始化数据库
    
    创建所有表结构（如果不存在）。
    """
    try:
        # 导入所有模型以确保它们被注册
        from app.models import image, patient, report, system, team, user
        
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        logger.info("✅ 数据库表结构初始化完成")
        
    except Exception as e:
        logger.error(f"❌ 数据库初始化失败: {e}")
        raise


async def close_db():
    """
    关闭数据库连接
    
    清理数据库连接资源。
    """
    try:
        engine.dispose()
        logger.info("✅ 数据库连接已关闭")
    except Exception as e:
        logger.error(f"❌ 数据库关闭失败: {e}")
        raise
