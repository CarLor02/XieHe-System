"""
数据库基础模型

定义所有模型的基类和通用字段

作者: XieHe Medical System
创建时间: 2025-10-13
"""

from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, DateTime, Boolean, func

# 创建基础模型类
Base = declarative_base()


class TimestampMixin:
    """时间戳混入类"""
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")


class SoftDeleteMixin:
    """软删除混入类"""
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, nullable=True, comment="删除时间")
    deleted_by = Column(Integer, nullable=True, comment="删除人ID")


class UserTrackingMixin:
    """用户追踪混入类"""
    created_by = Column(Integer, nullable=True, comment="创建人ID")
    updated_by = Column(Integer, nullable=True, comment="更新人ID")


class BaseModel(Base, TimestampMixin, SoftDeleteMixin, UserTrackingMixin):
    """基础模型类，包含通用字段"""
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="主键ID")

