"""
影像管理相关模型

简化版本 - 专注于X光影像处理
包含影像文件、标注、AI任务等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
更新时间: 2026-01-14 - 简化数据模型，去除Study/Series/Instance层级
"""

import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Boolean, Enum, ForeignKey, Float, JSON, func
from sqlalchemy.orm import relationship
from .base import Base


# 枚举定义
class ModalityEnum(str, enum.Enum):
    """影像模态枚举 - 简化为X光相关"""
    XR = "XR"      # X-Ray 普通X光
    DX = "DX"      # Digital X-Ray 数字X光
    CR = "CR"      # Computed Radiography 计算机放射摄影
    DR = "DR"      # Digital Radiography 数字放射摄影
    OTHER = "OTHER"


class BodyPartEnum(str, enum.Enum):
    """身体部位枚举 - 专注于脊柱"""
    SPINE_CERVICAL = "SPINE_CERVICAL"      # 颈椎
    SPINE_THORACIC = "SPINE_THORACIC"      # 胸椎
    SPINE_LUMBAR = "SPINE_LUMBAR"          # 腰椎
    SPINE_FULL = "SPINE_FULL"              # 全脊柱
    PELVIS = "PELVIS"                      # 骨盆
    OTHER = "OTHER"


class ImageViewType(str, enum.Enum):
    """影像视图类型"""
    FRONT = "FRONT"    # 正位
    SIDE = "SIDE"      # 侧位
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

    id = Column(Integer, primary_key=True, autoincrement=True, comment="标注ID")
    image_file_id = Column(Integer, ForeignKey('image_files.id'), nullable=False, comment="影像文件ID")

    annotation_type = Column(Enum(AnnotationTypeEnum), nullable=False, comment="标注类型")
    coordinates = Column(JSON, nullable=False, comment="坐标")
    label = Column(String(100), comment="标签")
    description = Column(Text, comment="描述")
    measurement_value = Column(Float, comment="测量值")
    measurement_unit = Column(String(20), comment="测量单位")
    color = Column(String(7), comment="颜色")
    thickness = Column(Integer, comment="线条粗细")
    opacity = Column(Float, comment="透明度")
    is_visible = Column(Boolean, default=True, comment="是否可见")
    is_locked = Column(Boolean, default=False, comment="是否锁定")
    notes = Column(Text, comment="备注")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")

    # 关系
    image_file = relationship("ImageFile", backref="annotations")


class AITask(Base):
    """AI任务表"""
    __tablename__ = "ai_tasks"

    id = Column(Integer, primary_key=True, autoincrement=True, comment="任务ID")
    task_id = Column(String(64), unique=True, nullable=False, comment="任务ID")
    image_file_id = Column(Integer, ForeignKey('image_files.id'), nullable=False, comment="影像文件ID")

    task_name = Column(String(100), nullable=False, comment="任务名称")
    task_type = Column(String(50), nullable=False, comment="任务类型")
    model_name = Column(String(100), nullable=False, comment="模型名称")
    model_version = Column(String(20), comment="模型版本")
    input_parameters = Column(JSON, comment="输入参数")
    status = Column(Enum(AITaskStatusEnum), nullable=False, comment="状态")
    progress = Column(Float, comment="进度")
    started_at = Column(DateTime, comment="开始时间")
    completed_at = Column(DateTime, comment="完成时间")
    duration = Column(Float, comment="耗时(秒)")
    result = Column(JSON, comment="结果")
    confidence = Column(Float, comment="置信度")
    error_message = Column(Text, comment="错误信息")
    notes = Column(Text, comment="备注")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")

    # 关系
    image_file = relationship("ImageFile", backref="ai_tasks")

