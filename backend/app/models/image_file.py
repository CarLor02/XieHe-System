"""
影像文件管理模型

用于记录用户上传的所有影像文件信息,支持通过用户查询而不是扫描文件夹

作者: XieHe Medical System
创建时间: 2026-01-05
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, ForeignKey, BigInteger, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .base import Base


class ImageFileTypeEnum(str, enum.Enum):
    """影像文件类型枚举"""
    DICOM = "DICOM"  # DICOM格式
    JPEG = "JPEG"    # JPEG图像
    PNG = "PNG"      # PNG图像
    TIFF = "TIFF"    # TIFF图像
    OTHER = "OTHER"  # 其他格式


class ImageFileStatusEnum(str, enum.Enum):
    """影像文件状态枚举"""
    UPLOADING = "UPLOADING"      # 上传中
    UPLOADED = "UPLOADED"        # 已上传
    PROCESSING = "PROCESSING"    # 处理中
    PROCESSED = "PROCESSED"      # 已处理
    FAILED = "FAILED"            # 失败
    ARCHIVED = "ARCHIVED"        # 已归档
    DELETED = "DELETED"          # 已删除


class ImageFile(Base):
    """影像文件表 - 记录所有上传的影像文件"""
    __tablename__ = "image_files"
    
    # 基本信息
    id = Column(Integer, primary_key=True, autoincrement=True, comment="文件ID")
    file_uuid = Column(String(64), unique=True, nullable=False, comment="文件UUID")
    original_filename = Column(String(255), nullable=False, comment="原始文件名")
    file_type = Column(Enum(ImageFileTypeEnum), nullable=False, comment="文件类型")
    mime_type = Column(String(100), comment="MIME类型")
    
    # 文件存储信息
    storage_path = Column(String(500), nullable=False, comment="文件存储路径(相对路径)")
    file_size = Column(BigInteger, nullable=False, comment="文件大小(字节)")
    file_hash = Column(String(64), comment="文件MD5哈希值")
    
    # 缩略图信息
    thumbnail_path = Column(String(500), comment="缩略图路径")
    
    # 关联信息
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False, comment="上传用户ID")
    patient_id = Column(Integer, ForeignKey('patients.id'), comment="关联患者ID")
    study_id = Column(Integer, ForeignKey('studies.id'), comment="关联检查ID")
    series_id = Column(Integer, ForeignKey('series.id'), comment="关联序列ID")
    
    # 影像元数据
    modality = Column(String(16), comment="影像模态(CT/MR/XR等)")
    body_part = Column(String(64), comment="身体部位")
    study_date = Column(DateTime, comment="检查日期")
    description = Column(Text, comment="文件描述")
    
    # 状态信息
    status = Column(Enum(ImageFileStatusEnum), nullable=False, default=ImageFileStatusEnum.UPLOADING, comment="文件状态")
    upload_progress = Column(Integer, default=0, comment="上传进度(0-100)")
    
    # 分片上传信息(用于大文件)
    is_chunked = Column(Boolean, default=False, comment="是否分片上传")
    total_chunks = Column(Integer, comment="总分片数")
    uploaded_chunks = Column(Text, comment="已上传分片列表(JSON)")
    
    # 时间戳
    created_at = Column(DateTime, default=func.now(), nullable=False, comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    uploaded_at = Column(DateTime, comment="上传完成时间")
    
    # 软删除
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, ForeignKey('users.id'), comment="删除人ID")
    
    # 关系映射
    uploader = relationship("User", foreign_keys=[uploaded_by], backref="uploaded_images")
    deleter = relationship("User", foreign_keys=[deleted_by], backref="deleted_images")
    
    def __repr__(self):
        return f"<ImageFile(id={self.id}, filename={self.original_filename}, uploaded_by={self.uploaded_by})>"
