"""
影像管理相关模型

包含检查、序列、实例、标注、AI任务等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
"""

import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Boolean, Enum, ForeignKey, Float, JSON, func
from sqlalchemy.orm import relationship
from .base import Base


# 枚举定义
class ModalityEnum(str, enum.Enum):
    """影像模态枚举"""
    CT = "CT"
    MR = "MR"
    XR = "XR"
    US = "US"
    NM = "NM"
    PT = "PT"
    MG = "MG"
    DX = "DX"
    CR = "CR"
    DR = "DR"
    RF = "RF"
    SC = "SC"
    OTHER = "OTHER"


class BodyPartEnum(str, enum.Enum):
    """身体部位枚举"""
    HEAD = "HEAD"
    NECK = "NECK"
    CHEST = "CHEST"
    ABDOMEN = "ABDOMEN"
    PELVIS = "PELVIS"
    SPINE = "SPINE"
    EXTREMITY = "EXTREMITY"
    WHOLE_BODY = "WHOLE_BODY"
    OTHER = "OTHER"


class StudyStatusEnum(str, enum.Enum):
    """检查状态枚举"""
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    ARCHIVED = "ARCHIVED"


class SeriesStatusEnum(str, enum.Enum):
    """序列状态枚举"""
    RECEIVING = "RECEIVING"
    RECEIVED = "RECEIVED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"


class InstanceStatusEnum(str, enum.Enum):
    """实例状态枚举"""
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    PROCESSING = "PROCESSING"
    PROCESSED = "PROCESSED"
    FAILED = "FAILED"
    ARCHIVED = "ARCHIVED"


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


class Study(Base):
    """检查表"""
    __tablename__ = "studies"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="检查ID")
    study_instance_uid = Column(String(64), unique=True, nullable=False, comment="检查实例UID")
    study_id = Column(String(16), comment="检查ID")
    accession_number = Column(String(16), comment="检查号")
    patient_id = Column(Integer, nullable=False, comment="患者ID")
    study_date = Column(Date, comment="检查日期")
    study_time = Column(String(16), comment="检查时间")
    study_description = Column(String(64), comment="检查描述")
    modality = Column(Enum(ModalityEnum), comment="影像模态")
    body_part = Column(Enum(BodyPartEnum), comment="身体部位")
    referring_physician = Column(String(64), comment="转诊医生")
    performing_physician = Column(String(64), comment="执行医生")
    reading_physician = Column(String(64), comment="阅片医生")
    institution_name = Column(String(64), comment="机构名称")
    station_name = Column(String(16), comment="工作站名称")
    manufacturer = Column(String(64), comment="制造商")
    model_name = Column(String(64), comment="型号")
    series_count = Column(Integer, comment="序列数量")
    instance_count = Column(Integer, comment="实例数量")
    total_size = Column(Integer, comment="总大小")
    status = Column(Enum(StudyStatusEnum), nullable=False, comment="状态")
    priority = Column(String(20), comment="优先级")
    quality = Column(Enum(QualityEnum), comment="质量")
    notes = Column(Text, comment="备注")
    tags = Column(JSON, comment="标签")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
    
    # 关系
    series = relationship("Series", back_populates="study")
    annotations = relationship("ImageAnnotation", back_populates="study")
    ai_tasks = relationship("AITask", back_populates="study")


class Series(Base):
    """序列表"""
    __tablename__ = "series"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="序列ID")
    series_instance_uid = Column(String(64), unique=True, nullable=False, comment="序列实例UID")
    series_number = Column(Integer, comment="序列号")
    study_id = Column(Integer, ForeignKey('studies.id'), nullable=False, comment="检查ID")
    series_date = Column(Date, comment="序列日期")
    series_time = Column(String(16), comment="序列时间")
    series_description = Column(String(64), comment="序列描述")
    protocol_name = Column(String(64), comment="协议名称")
    modality = Column(Enum(ModalityEnum), comment="影像模态")
    body_part = Column(Enum(BodyPartEnum), comment="身体部位")
    slice_thickness = Column(Float, comment="层厚")
    pixel_spacing = Column(String(32), comment="像素间距")
    image_orientation = Column(String(64), comment="图像方向")
    kvp = Column(Float, comment="管电压")
    exposure_time = Column(Float, comment="曝光时间")
    tube_current = Column(Float, comment="管电流")
    instance_count = Column(Integer, comment="实例数量")
    total_size = Column(Integer, comment="总大小")
    status = Column(Enum(SeriesStatusEnum), nullable=False, comment="状态")
    quality = Column(Enum(QualityEnum), comment="质量")
    notes = Column(Text, comment="备注")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
    
    # 关系
    study = relationship("Study", back_populates="series")
    instances = relationship("Instance", back_populates="series")


class Instance(Base):
    """实例表"""
    __tablename__ = "instances"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="实例ID")
    sop_instance_uid = Column(String(64), unique=True, nullable=False, comment="SOP实例UID")
    sop_class_uid = Column(String(64), comment="SOP类UID")
    instance_number = Column(Integer, comment="实例号")
    series_id = Column(Integer, ForeignKey('series.id'), nullable=False, comment="序列ID")
    file_path = Column(String(500), comment="文件路径")
    file_name = Column(String(255), comment="文件名")
    file_size = Column(Integer, comment="文件大小")
    file_hash = Column(String(64), comment="文件哈希")
    image_type = Column(String(64), comment="图像类型")
    rows = Column(Integer, comment="行数")
    columns = Column(Integer, comment="列数")
    bits_allocated = Column(Integer, comment="分配位数")
    bits_stored = Column(Integer, comment="存储位数")
    slice_location = Column(Float, comment="层位置")
    image_position = Column(String(64), comment="图像位置")
    window_center = Column(Float, comment="窗位")
    window_width = Column(Float, comment="窗宽")
    status = Column(Enum(InstanceStatusEnum), nullable=False, comment="状态")
    quality = Column(Enum(QualityEnum), comment="质量")
    thumbnail_path = Column(String(500), comment="缩略图路径")
    preview_path = Column(String(500), comment="预览图路径")
    processed_at = Column(DateTime, comment="处理时间")
    notes = Column(Text, comment="备注")
    dicom_metadata = Column(JSON, comment="DICOM元数据")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
    
    # 关系
    series = relationship("Series", back_populates="instances")
    annotations = relationship("ImageAnnotation", back_populates="instance")


class ImageAnnotation(Base):
    """影像标注表"""
    __tablename__ = "image_annotations"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="标注ID")
    study_id = Column(Integer, ForeignKey('studies.id'), nullable=False, comment="检查ID")
    instance_id = Column(Integer, ForeignKey('instances.id'), comment="实例ID")
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
    study = relationship("Study", back_populates="annotations")
    instance = relationship("Instance", back_populates="annotations")


class AITask(Base):
    """AI任务表"""
    __tablename__ = "ai_tasks"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="任务ID")
    task_id = Column(String(64), unique=True, nullable=False, comment="任务ID")
    study_id = Column(Integer, ForeignKey('studies.id'), nullable=False, comment="检查ID")
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
    study = relationship("Study", back_populates="ai_tasks")

