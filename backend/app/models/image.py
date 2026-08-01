"""
影像管理相关模型

简化版本 - 专注于X光影像处理
包含影像文件、标注、AI任务等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
更新时间: 2026-01-14 - 简化数据模型，去除Study/Series/Instance层级
"""

from __future__ import annotations

import datetime as datetime_types
import enum
import typing
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, relationship

from .base import Base

if TYPE_CHECKING:
    from .image_file import ImageFile
    from .image_import import ImageImportItem


# 枚举定义
class ModalityEnum(str, enum.Enum):
    """影像模态枚举 - 简化为X光相关"""

    XR = "XR"  # X-Ray 普通X光
    DX = "DX"  # Digital X-Ray 数字X光
    CR = "CR"  # Computed Radiography 计算机放射摄影
    DR = "DR"  # Digital Radiography 数字放射摄影
    OTHER = "OTHER"


class BodyPartEnum(str, enum.Enum):
    """身体部位枚举 - 专注于脊柱"""

    SPINE_CERVICAL = "SPINE_CERVICAL"  # 颈椎
    SPINE_THORACIC = "SPINE_THORACIC"  # 胸椎
    SPINE_LUMBAR = "SPINE_LUMBAR"  # 腰椎
    SPINE_FULL = "SPINE_FULL"  # 全脊柱
    PELVIS = "PELVIS"  # 骨盆
    OTHER = "OTHER"


class ImageViewType(str, enum.Enum):
    """影像视图类型"""

    FRONT = "FRONT"  # 正位
    SIDE = "SIDE"  # 侧位
    OBLIQUE = "OBLIQUE"  # 斜位
    OTHER = "OTHER"


class QualityEnum(str, enum.Enum):
    """质量枚举"""

    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    ACCEPTABLE = "ACCEPTABLE"
    POOR = "POOR"
    UNACCEPTABLE = "UNACCEPTABLE"


class AnnotationTypeEnum(str, enum.Enum):
    """标注类型枚举"""

    POINT = "POINT"
    LINE = "LINE"
    ANGLE = "ANGLE"
    DISTANCE = "DISTANCE"
    RECTANGLE = "RECTANGLE"
    CIRCLE = "CIRCLE"
    POLYGON = "POLYGON"
    FREEHAND = "FREEHAND"
    TEXT = "TEXT"
    MEASUREMENT = "MEASUREMENT"


class AITaskStatusEnum(str, enum.Enum):
    """AI任务状态枚举"""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


# ============ 废弃的枚举和模型已移除 ============
# Study/Series/Instance 模型及相关枚举已在 2026-01-14 移除
# 现在使用 ImageFile 模型替代


class ImageAnnotation(Base):
    """影像标注表"""

    __tablename__ = "image_annotations"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="标注ID"
    )
    image_file_id: Mapped[int] = Column(
        Integer, ForeignKey("image_files.id"), nullable=False, comment="影像文件ID"
    )

    annotation_type: Mapped[AnnotationTypeEnum] = Column(
        Enum(AnnotationTypeEnum), nullable=False, comment="标注类型"
    )
    coordinates: Mapped[typing.Any] = Column(JSON, nullable=False, comment="坐标")
    label: Mapped[typing.Any] = Column(String(100), comment="标签")
    description: Mapped[str | None] = Column(Text, comment="描述")
    measurement_value: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="测量值"
    )
    measurement_unit: Mapped[typing.Any] = Column(String(20), comment="测量单位")
    color: Mapped[typing.Any] = Column(String(7), comment="颜色")
    thickness: Mapped[int | None] = Column(Integer, comment="线条粗细")
    opacity: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="透明度"
    )
    is_visible: Mapped[bool | None] = Column(Boolean, default=True, comment="是否可见")
    is_locked: Mapped[bool | None] = Column(Boolean, default=False, comment="是否锁定")
    notes: Mapped[str | None] = Column(Text, comment="备注")
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    created_by: Mapped[int | None] = Column(Integer, comment="创建人ID")
    updated_by: Mapped[int | None] = Column(Integer, comment="更新人ID")
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(Integer, comment="删除人ID")

    # 关系
    image_file: Mapped[ImageFile] = relationship("ImageFile", backref="annotations")


class AITask(Base):
    """AI任务表"""

    __tablename__ = "ai_tasks"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="任务ID"
    )
    task_id: Mapped[typing.Any] = Column(
        String(64), unique=True, nullable=False, comment="任务ID"
    )
    image_file_id: Mapped[int | None] = Column(
        Integer, ForeignKey("image_files.id"), nullable=True, comment="影像文件ID"
    )
    batch_item_id: Mapped[int | None] = Column(
        Integer,
        ForeignKey("image_import_items.id"),
        nullable=True,
        comment="批量导入项ID",
    )
    attempt_count: Mapped[int] = Column(
        Integer, nullable=False, default=0, comment="处理尝试次数"
    )

    task_name: Mapped[typing.Any] = Column(
        String(100), nullable=False, comment="任务名称"
    )
    task_type: Mapped[typing.Any] = Column(
        String(50), nullable=False, comment="任务类型"
    )
    model_name: Mapped[typing.Any] = Column(
        String(100), nullable=False, comment="模型名称"
    )
    model_version: Mapped[typing.Any] = Column(String(20), comment="模型版本")
    input_parameters: Mapped[typing.Any] = Column(JSON, comment="输入参数")
    status: Mapped[AITaskStatusEnum] = Column(
        Enum(AITaskStatusEnum), nullable=False, comment="状态"
    )
    progress: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="进度"
    )
    started_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="开始时间"
    )
    completed_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="完成时间"
    )
    duration: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="耗时(秒)"
    )
    result: Mapped[typing.Any] = Column(JSON, comment="结果")
    confidence: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="置信度"
    )
    error_message: Mapped[str | None] = Column(Text, comment="错误信息")
    notes: Mapped[str | None] = Column(Text, comment="备注")
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    created_by: Mapped[int | None] = Column(Integer, comment="创建人ID")
    updated_by: Mapped[int | None] = Column(Integer, comment="更新人ID")
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(Integer, comment="删除人ID")

    # 关系
    image_file: Mapped[ImageFile | None] = relationship("ImageFile", backref="ai_tasks")
    batch_item: Mapped[ImageImportItem | None] = relationship("ImageImportItem")
