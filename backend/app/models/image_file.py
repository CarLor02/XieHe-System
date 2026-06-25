"""
影像文件管理模型

用于记录用户上传的所有影像文件信息,支持通过用户查询而不是扫描文件夹

作者: XieHe Medical System
创建时间: 2026-01-05
"""

import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Enum, ForeignKey, BigInteger, Text, JSON
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
    
    # 对象存储信息
    storage_bucket = Column(String(128), nullable=False, comment="对象存储桶")
    object_key = Column(String(500), nullable=False, comment="对象存储Key")
    storage_etag = Column(String(128), comment="对象存储ETag")
    file_size = Column(BigInteger, nullable=False, comment="文件大小(字节)")
    file_hash = Column(String(64), comment="文件MD5哈希值")
    
    # 缩略图信息
    thumbnail_path = Column(String(500), comment="缩略图路径")
    
    # 关联信息
    uploaded_by = Column(Integer, ForeignKey('users.id'), nullable=False, comment="上传用户ID")
    patient_id = Column(Integer, ForeignKey('patients.id'), comment="关联患者ID")

    # 影像元数据
    study_date = Column(DateTime, comment="检查日期")
    description = Column(Text, comment="文件描述")
    
    # 标注数据
    annotation = Column(JSON, comment="标注数据(JSON格式)")
    
    # 状态信息
    status = Column(Enum(ImageFileStatusEnum), nullable=False, default=ImageFileStatusEnum.UPLOADING, comment="文件状态")
    upload_progress = Column(Integer, default=0, comment="上传进度(0-100)")
    
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
    team_visibilities = relationship(
        "ImageFileTeamVisibility",
        back_populates="image_file",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    
    def __repr__(self):
        return f"<ImageFile(id={self.id}, filename={self.original_filename}, uploaded_by={self.uploaded_by})>"


class ImageFileTeamVisibility(Base):
    """团队对影像文件的可见归属。"""

    __tablename__ = "image_file_team_visibility"

    image_file_id = Column(
        Integer,
        ForeignKey("image_files.id"),
        primary_key=True,
        comment="影像文件ID",
    )
    team_id = Column(
        Integer,
        ForeignKey("teams.id"),
        primary_key=True,
        comment="团队ID",
    )
    created_at = Column(DateTime, default=func.now(), nullable=False, comment="创建时间")

    image_file = relationship("ImageFile", back_populates="team_visibilities")
    team = relationship("Team")
