#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
影像管理表初始化脚本

创建医学影像管理相关的数据库表并插入测试数据。
包含DICOM检查、序列、实例、标注、AI任务等表。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import sys
import os
import io

# 设置标准输出编码为UTF-8（解决Windows下emoji显示问题）
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
import secrets
import hashlib
from datetime import datetime, date, timedelta
from decimal import Decimal
import uuid
from dotenv import load_dotenv

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 加载backend目录下的.env文件
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# 创建Base
Base = declarative_base()

# 重新定义模型以避免配置依赖
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey, Table, Index, UniqueConstraint, Enum, Numeric, JSON, LargeBinary, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

# 从环境变量读取数据库配置
MYSQL_HOST = os.getenv("DB_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("DB_PORT", "3306"))
MYSQL_USER = os.getenv("DB_USER", "root")
MYSQL_PASSWORD = os.getenv("DB_PASSWORD", "123456")
MYSQL_DATABASE = os.getenv("DB_NAME", "medical_imaging_system")

# 构建数据库URL
DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    f"?charset=utf8mb4"
)

# 枚举定义
class StudyStatusEnum(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

class SeriesStatusEnum(str, enum.Enum):
    RECEIVING = "receiving"
    RECEIVED = "received"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"

class InstanceStatusEnum(str, enum.Enum):
    UPLOADING = "uploading"
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    ARCHIVED = "archived"

class ModalityEnum(str, enum.Enum):
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
    HEAD = "head"
    NECK = "neck"
    CHEST = "chest"
    ABDOMEN = "abdomen"
    PELVIS = "pelvis"
    SPINE = "spine"
    EXTREMITY = "extremity"
    WHOLE_BODY = "whole_body"
    OTHER = "other"

class ImageQualityEnum(str, enum.Enum):
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    UNACCEPTABLE = "unacceptable"

class AnnotationTypeEnum(str, enum.Enum):
    POINT = "point"
    LINE = "line"
    RECTANGLE = "rectangle"
    CIRCLE = "circle"
    POLYGON = "polygon"
    FREEHAND = "freehand"
    TEXT = "text"
    MEASUREMENT = "measurement"

class AITaskStatusEnum(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# 简化的模型定义
class Study(Base):
    __tablename__ = 'studies'
    
    id = Column(Integer, primary_key=True)
    study_instance_uid = Column(String(64), unique=True, nullable=False)
    study_id = Column(String(16), nullable=True)
    accession_number = Column(String(16), nullable=True)
    patient_id = Column(Integer, nullable=False)
    study_date = Column(Date, nullable=True)
    study_time = Column(String(16), nullable=True)
    study_description = Column(String(64), nullable=True)
    modality = Column(Enum(ModalityEnum), nullable=True)
    body_part = Column(Enum(BodyPartEnum), nullable=True)
    referring_physician = Column(String(64), nullable=True)
    performing_physician = Column(String(64), nullable=True)
    reading_physician = Column(String(64), nullable=True)
    institution_name = Column(String(64), nullable=True)
    station_name = Column(String(16), nullable=True)
    manufacturer = Column(String(64), nullable=True)
    model_name = Column(String(64), nullable=True)
    series_count = Column(Integer, default=0)
    instance_count = Column(Integer, default=0)
    total_size = Column(Integer, default=0)
    status = Column(Enum(StudyStatusEnum), default=StudyStatusEnum.SCHEDULED, nullable=False)
    priority = Column(String(20), default='normal')
    quality = Column(Enum(ImageQualityEnum), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    series = relationship("Series", back_populates="study")
    annotations = relationship("ImageAnnotation", back_populates="study")
    ai_tasks = relationship("AITask", back_populates="study")

class Series(Base):
    __tablename__ = 'series'
    
    id = Column(Integer, primary_key=True)
    series_instance_uid = Column(String(64), unique=True, nullable=False)
    series_number = Column(Integer, nullable=True)
    study_id = Column(Integer, ForeignKey('studies.id'), nullable=False)
    series_date = Column(Date, nullable=True)
    series_time = Column(String(16), nullable=True)
    series_description = Column(String(64), nullable=True)
    protocol_name = Column(String(64), nullable=True)
    modality = Column(Enum(ModalityEnum), nullable=True)
    body_part = Column(Enum(BodyPartEnum), nullable=True)
    slice_thickness = Column(Float, nullable=True)
    pixel_spacing = Column(String(32), nullable=True)
    image_orientation = Column(String(64), nullable=True)
    kvp = Column(Float, nullable=True)
    exposure_time = Column(Float, nullable=True)
    tube_current = Column(Float, nullable=True)
    instance_count = Column(Integer, default=0)
    total_size = Column(Integer, default=0)
    status = Column(Enum(SeriesStatusEnum), default=SeriesStatusEnum.RECEIVING, nullable=False)
    quality = Column(Enum(ImageQualityEnum), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    study = relationship("Study", back_populates="series")
    instances = relationship("Instance", back_populates="series")

class Instance(Base):
    __tablename__ = 'instances'
    
    id = Column(Integer, primary_key=True)
    sop_instance_uid = Column(String(64), unique=True, nullable=False)
    sop_class_uid = Column(String(64), nullable=True)
    instance_number = Column(Integer, nullable=True)
    series_id = Column(Integer, ForeignKey('series.id'), nullable=False)
    file_path = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_hash = Column(String(64), nullable=True)
    image_type = Column(String(64), nullable=True)
    rows = Column(Integer, nullable=True)
    columns = Column(Integer, nullable=True)
    bits_allocated = Column(Integer, nullable=True)
    bits_stored = Column(Integer, nullable=True)
    slice_location = Column(Float, nullable=True)
    image_position = Column(String(64), nullable=True)
    window_center = Column(Float, nullable=True)
    window_width = Column(Float, nullable=True)
    status = Column(Enum(InstanceStatusEnum), default=InstanceStatusEnum.UPLOADING, nullable=False)
    quality = Column(Enum(ImageQualityEnum), nullable=True)
    thumbnail_path = Column(String(500), nullable=True)
    preview_path = Column(String(500), nullable=True)
    processed_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)
    dicom_metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    series = relationship("Series", back_populates="instances")
    annotations = relationship("ImageAnnotation", back_populates="instance")

class ImageAnnotation(Base):
    __tablename__ = 'image_annotations'
    
    id = Column(Integer, primary_key=True)
    study_id = Column(Integer, ForeignKey('studies.id'), nullable=False)
    instance_id = Column(Integer, ForeignKey('instances.id'), nullable=True)
    annotation_type = Column(Enum(AnnotationTypeEnum), nullable=False)
    coordinates = Column(JSON, nullable=False)
    label = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    measurement_value = Column(Float, nullable=True)
    measurement_unit = Column(String(20), nullable=True)
    color = Column(String(7), default='#FF0000')
    thickness = Column(Integer, default=2)
    opacity = Column(Float, default=1.0)
    is_visible = Column(Boolean, default=True)
    is_locked = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    study = relationship("Study", back_populates="annotations")
    instance = relationship("Instance", back_populates="annotations")

class AITask(Base):
    __tablename__ = 'ai_tasks'
    
    id = Column(Integer, primary_key=True)
    task_id = Column(String(64), unique=True, nullable=False)
    study_id = Column(Integer, ForeignKey('studies.id'), nullable=False)
    task_name = Column(String(100), nullable=False)
    task_type = Column(String(50), nullable=False)
    model_name = Column(String(100), nullable=False)
    model_version = Column(String(20), nullable=True)
    input_parameters = Column(JSON, nullable=True)
    status = Column(Enum(AITaskStatusEnum), default=AITaskStatusEnum.PENDING, nullable=False)
    progress = Column(Float, default=0.0)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    duration = Column(Float, nullable=True)
    result = Column(JSON, nullable=True)
    confidence = Column(Float, nullable=True)
    error_message = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    study = relationship("Study", back_populates="ai_tasks")


def generate_dicom_uid():
    """生成DICOM UID"""
    # 使用简化的UID格式：1.2.826.0.1.3680043.8.498.{timestamp}.{random}
    timestamp = int(datetime.now().timestamp() * 1000)
    random_part = secrets.randbelow(999999)
    return f"1.2.826.0.1.3680043.8.498.{timestamp}.{random_part}"


def calculate_file_hash(content):
    """计算文件哈希值"""
    return hashlib.md5(content.encode()).hexdigest()


def main():
    print("🚀 开始初始化影像管理表...")
    print("=" * 60)
    
    try:
        # 创建数据库引擎
        engine = create_engine(DATABASE_URL, echo=True)
        
        # 创建会话
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        print("🔧 初始化数据库表结构...")
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表结构创建成功!")
        
        print("🏥 初始化检查(Study)测试数据...")
        
        # 创建测试检查数据
        studies_data = [
            {
                'study_instance_uid': generate_dicom_uid(),
                'study_id': 'ST001',
                'accession_number': 'ACC001',
                'patient_id': 1,  # 张三
                'study_date': date.today() - timedelta(days=1),
                'study_time': '14:30:00',
                'study_description': '胸部CT平扫',
                'modality': ModalityEnum.CT,
                'body_part': BodyPartEnum.CHEST,
                'referring_physician': '张医生',
                'performing_physician': '李技师',
                'reading_physician': '李影像',
                'institution_name': '北京协和医院',
                'station_name': 'CT01',
                'manufacturer': 'SIEMENS',
                'model_name': 'SOMATOM Definition AS',
                'series_count': 2,
                'instance_count': 150,
                'total_size': 157286400,  # ~150MB
                'status': StudyStatusEnum.COMPLETED,
                'priority': 'normal',
                'quality': ImageQualityEnum.GOOD,
                'notes': '患者配合良好，图像质量佳',
                'tags': ['胸部', 'CT', '平扫'],
                'created_by': 3
            },
            {
                'study_instance_uid': generate_dicom_uid(),
                'study_id': 'ST002',
                'accession_number': 'ACC002',
                'patient_id': 2,  # 王丽
                'study_date': date.today(),
                'study_time': '09:15:00',
                'study_description': '头颅MRI增强',
                'modality': ModalityEnum.MR,
                'body_part': BodyPartEnum.HEAD,
                'referring_physician': '张医生',
                'performing_physician': '王技师',
                'reading_physician': '李影像',
                'institution_name': '北京协和医院',
                'station_name': 'MR01',
                'manufacturer': 'GE',
                'model_name': 'SIGNA Pioneer',
                'series_count': 4,
                'instance_count': 320,
                'total_size': 268435456,  # ~256MB
                'status': StudyStatusEnum.IN_PROGRESS,
                'priority': 'high',
                'quality': ImageQualityEnum.EXCELLENT,
                'notes': 'VIP患者，优先处理',
                'tags': ['头颅', 'MRI', '增强', 'VIP'],
                'created_by': 3
            },
            {
                'study_instance_uid': generate_dicom_uid(),
                'study_id': 'ST003',
                'accession_number': 'ACC003',
                'patient_id': 3,  # 李老先生
                'study_date': date.today() - timedelta(days=3),
                'study_time': '16:45:00',
                'study_description': '腹部超声检查',
                'modality': ModalityEnum.US,
                'body_part': BodyPartEnum.ABDOMEN,
                'referring_physician': '张医生',
                'performing_physician': '赵技师',
                'reading_physician': '李影像',
                'institution_name': '北京协和医院',
                'station_name': 'US01',
                'manufacturer': 'PHILIPS',
                'model_name': 'EPIQ Elite',
                'series_count': 1,
                'instance_count': 25,
                'total_size': 52428800,  # ~50MB
                'status': StudyStatusEnum.COMPLETED,
                'priority': 'urgent',
                'quality': ImageQualityEnum.ACCEPTABLE,
                'notes': '高龄患者，检查过程中需要多次休息',
                'tags': ['腹部', '超声', '高龄'],
                'created_by': 4
            }
        ]
        
        created_studies = []
        for study_data in studies_data:
            study = Study(**study_data)
            session.add(study)
            session.flush()  # 获取ID
            created_studies.append(study)
            print(f"   创建检查: {study.study_description} ({study.study_id}) - {study.modality.value}")
        
        session.commit()
        
        print("📸 初始化序列(Series)数据...")
        
        # 创建序列数据
        series_data = [
            # 胸部CT的序列
            {
                'series_instance_uid': generate_dicom_uid(),
                'series_number': 1,
                'study_id': created_studies[0].id,
                'series_date': created_studies[0].study_date,
                'series_time': '14:32:00',
                'series_description': '胸部CT轴位',
                'protocol_name': 'Chest Routine',
                'modality': ModalityEnum.CT,
                'body_part': BodyPartEnum.CHEST,
                'slice_thickness': 5.0,
                'pixel_spacing': '0.625\\0.625',
                'image_orientation': '1\\0\\0\\0\\1\\0',
                'kvp': 120.0,
                'exposure_time': 500.0,
                'tube_current': 200.0,
                'instance_count': 120,
                'total_size': 125829120,
                'status': SeriesStatusEnum.PROCESSED,
                'quality': ImageQualityEnum.GOOD,
                'notes': '标准胸部CT扫描',
                'created_by': 3
            },
            {
                'series_instance_uid': generate_dicom_uid(),
                'series_number': 2,
                'study_id': created_studies[0].id,
                'series_date': created_studies[0].study_date,
                'series_time': '14:35:00',
                'series_description': '胸部CT冠状位重建',
                'protocol_name': 'Chest Coronal MPR',
                'modality': ModalityEnum.CT,
                'body_part': BodyPartEnum.CHEST,
                'slice_thickness': 3.0,
                'pixel_spacing': '0.625\\0.625',
                'image_orientation': '1\\0\\0\\0\\0\\-1',
                'instance_count': 30,
                'total_size': 31457280,
                'status': SeriesStatusEnum.PROCESSED,
                'quality': ImageQualityEnum.GOOD,
                'notes': '冠状位重建图像',
                'created_by': 3
            },
            # 头颅MRI的序列
            {
                'series_instance_uid': generate_dicom_uid(),
                'series_number': 1,
                'study_id': created_studies[1].id,
                'series_date': created_studies[1].study_date,
                'series_time': '09:20:00',
                'series_description': 'T1WI轴位',
                'protocol_name': 'Brain T1 Axial',
                'modality': ModalityEnum.MR,
                'body_part': BodyPartEnum.HEAD,
                'slice_thickness': 4.0,
                'pixel_spacing': '0.5\\0.5',
                'image_orientation': '1\\0\\0\\0\\1\\0',
                'instance_count': 80,
                'total_size': 67108864,
                'status': SeriesStatusEnum.PROCESSING,
                'quality': ImageQualityEnum.EXCELLENT,
                'notes': 'T1加权轴位扫描',
                'created_by': 3
            }
        ]
        
        created_series = []
        for series_data_item in series_data:
            series = Series(**series_data_item)
            session.add(series)
            session.flush()
            created_series.append(series)
            print(f"   创建序列: {series.series_description} (#{series.series_number}) - {series.instance_count}张图像")
        
        session.commit()
        
        print("🖼️ 初始化实例(Instance)数据...")
        
        # 创建实例数据（示例）
        instances_data = [
            {
                'sop_instance_uid': generate_dicom_uid(),
                'sop_class_uid': '1.2.840.10008.5.1.4.1.1.2',  # CT Image Storage
                'instance_number': 1,
                'series_id': created_series[0].id,
                'file_path': '/data/dicom/studies/ST001/series001/image001.dcm',
                'file_name': 'image001.dcm',
                'file_size': 1048576,  # 1MB
                'file_hash': calculate_file_hash('sample_ct_image_001'),
                'image_type': 'ORIGINAL\\PRIMARY\\AXIAL',
                'rows': 512,
                'columns': 512,
                'bits_allocated': 16,
                'bits_stored': 12,
                'slice_location': -150.0,
                'image_position': '-256\\-256\\-150',
                'window_center': 40.0,
                'window_width': 400.0,
                'status': InstanceStatusEnum.PROCESSED,
                'quality': ImageQualityEnum.GOOD,
                'thumbnail_path': '/data/thumbnails/ST001_S001_I001_thumb.jpg',
                'preview_path': '/data/previews/ST001_S001_I001_preview.jpg',
                'processed_at': datetime.now() - timedelta(hours=2),
                'notes': '第一层图像',
                'dicom_metadata': {
                    'PatientName': '张三',
                    'StudyDate': '20250924',
                    'SeriesDescription': '胸部CT轴位',
                    'SliceThickness': 5.0,
                    'KVP': 120.0
                },
                'created_by': 3
            },
            {
                'sop_instance_uid': generate_dicom_uid(),
                'sop_class_uid': '1.2.840.10008.5.1.4.1.1.4',  # MR Image Storage
                'instance_number': 1,
                'series_id': created_series[2].id,
                'file_path': '/data/dicom/studies/ST002/series001/image001.dcm',
                'file_name': 'image001.dcm',
                'file_size': 838860,  # ~820KB
                'file_hash': calculate_file_hash('sample_mr_image_001'),
                'image_type': 'ORIGINAL\\PRIMARY\\M\\SE',
                'rows': 256,
                'columns': 256,
                'bits_allocated': 16,
                'bits_stored': 16,
                'slice_location': 80.0,
                'image_position': '-128\\-128\\80',
                'window_center': 300.0,
                'window_width': 600.0,
                'status': InstanceStatusEnum.PROCESSING,
                'quality': ImageQualityEnum.EXCELLENT,
                'thumbnail_path': '/data/thumbnails/ST002_S001_I001_thumb.jpg',
                'preview_path': '/data/previews/ST002_S001_I001_preview.jpg',
                'notes': 'T1WI轴位第一层',
                'dicom_metadata': {
                    'PatientName': '王丽',
                    'StudyDate': '20250924',
                    'SeriesDescription': 'T1WI轴位',
                    'SliceThickness': 4.0,
                    'MagneticFieldStrength': 3.0
                },
                'created_by': 3
            }
        ]
        
        created_instances = []
        for instance_data in instances_data:
            instance = Instance(**instance_data)
            session.add(instance)
            session.flush()
            created_instances.append(instance)
            print(f"   创建实例: {instance.file_name} - {instance.rows}x{instance.columns}")
        
        session.commit()
        
        print("📝 初始化标注数据...")
        
        # 创建标注数据
        annotations_data = [
            {
                'study_id': created_studies[0].id,
                'instance_id': created_instances[0].id,
                'annotation_type': AnnotationTypeEnum.RECTANGLE,
                'coordinates': {
                    'x': 200,
                    'y': 150,
                    'width': 80,
                    'height': 60
                },
                'label': '肺结节',
                'description': '右上肺可疑结节，直径约8mm',
                'measurement_value': 8.2,
                'measurement_unit': 'mm',
                'color': '#FF0000',
                'thickness': 2,
                'opacity': 0.8,
                'is_visible': True,
                'is_locked': False,
                'notes': '需要进一步随访观察',
                'created_by': 3
            },
            {
                'study_id': created_studies[1].id,
                'instance_id': created_instances[1].id,
                'annotation_type': AnnotationTypeEnum.CIRCLE,
                'coordinates': {
                    'centerX': 128,
                    'centerY': 128,
                    'radius': 25
                },
                'label': '脑组织',
                'description': '正常脑组织区域',
                'color': '#00FF00',
                'thickness': 1,
                'opacity': 0.6,
                'is_visible': True,
                'is_locked': False,
                'notes': '参考区域',
                'created_by': 3
            }
        ]
        
        for annotation_data in annotations_data:
            annotation = ImageAnnotation(**annotation_data)
            session.add(annotation)
            print(f"   创建标注: {annotation.label} - {annotation.annotation_type.value}")
        
        session.commit()
        
        print("🤖 初始化AI任务数据...")
        
        # 创建AI任务数据
        ai_tasks_data = [
            {
                'task_id': str(uuid.uuid4()),
                'study_id': created_studies[0].id,
                'task_name': '肺结节检测',
                'task_type': 'detection',
                'model_name': 'LungNoduleDetector',
                'model_version': 'v2.1.0',
                'input_parameters': {
                    'threshold': 0.5,
                    'min_size': 3,
                    'max_size': 30
                },
                'status': AITaskStatusEnum.COMPLETED,
                'progress': 100.0,
                'started_at': datetime.now() - timedelta(hours=1),
                'completed_at': datetime.now() - timedelta(minutes=30),
                'duration': 1800.0,  # 30分钟
                'result': {
                    'detections': [
                        {
                            'bbox': [200, 150, 280, 210],
                            'confidence': 0.85,
                            'class': 'nodule',
                            'size': 8.2
                        }
                    ],
                    'total_detections': 1
                },
                'confidence': 0.85,
                'notes': 'AI检测完成，发现1个可疑结节',
                'created_by': 3
            },
            {
                'task_id': str(uuid.uuid4()),
                'study_id': created_studies[1].id,
                'task_name': '脑组织分割',
                'task_type': 'segmentation',
                'model_name': 'BrainSegmentation',
                'model_version': 'v1.5.2',
                'input_parameters': {
                    'atlas': 'AAL',
                    'resolution': 'high'
                },
                'status': AITaskStatusEnum.RUNNING,
                'progress': 65.0,
                'started_at': datetime.now() - timedelta(minutes=15),
                'notes': 'AI分割进行中',
                'created_by': 3
            }
        ]
        
        for ai_task_data in ai_tasks_data:
            ai_task = AITask(**ai_task_data)
            session.add(ai_task)
            print(f"   创建AI任务: {ai_task.task_name} - {ai_task.status.value}")
        
        session.commit()
        
        print("=" * 60)
        print("🎉 影像管理表初始化完成!")
        
        # 统计数据
        print("📊 数据统计:")
        study_count = session.query(Study).count()
        series_count = session.query(Series).count()
        instance_count = session.query(Instance).count()
        annotation_count = session.query(ImageAnnotation).count()
        ai_task_count = session.query(AITask).count()
        
        print(f"   检查数量: {study_count}")
        print(f"   序列数量: {series_count}")
        print(f"   实例数量: {instance_count}")
        print(f"   标注数量: {annotation_count}")
        print(f"   AI任务数量: {ai_task_count}")
        
        print("\n🏥 测试检查信息:")
        for study in created_studies:
            print(f"   {study.study_description} ({study.study_id}) - {study.modality.value} - {study.status.value}")
        
        session.close()
        
    except Exception as e:
        print(f"❌ 初始化失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ 影像管理表初始化成功!")
        print("🎯 系统已准备好进行医学影像管理功能开发!")
    else:
        print("\n❌ 影像管理表初始化失败!")
        sys.exit(1)
