"""
影像文件管理模型

用于记录用户上传的所有影像文件信息,支持通过用户查询而不是扫描文件夹

作者: XieHe Medical System
创建时间: 2026-01-05
"""

from __future__ import annotations

import datetime as datetime_types
import enum
import typing

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.sql import func

from .base import Base

if typing.TYPE_CHECKING:
    from .team import Team
    from .user import User


class ImageFileTypeEnum(str, enum.Enum):
    """影像文件类型枚举"""

    DICOM = "DICOM"  # DICOM格式
    JPEG = "JPEG"  # JPEG图像
    PNG = "PNG"  # PNG图像
    TIFF = "TIFF"  # TIFF图像
    OTHER = "OTHER"  # 其他格式


class ImageFileStatusEnum(str, enum.Enum):
    """影像文件状态枚举"""

    UPLOADING = "UPLOADING"  # 上传中
    UPLOADED = "UPLOADED"  # 已上传
    PROCESSING = "PROCESSING"  # 处理中
    PROCESSED = "PROCESSED"  # 已处理
    FAILED = "FAILED"  # 失败
    ARCHIVED = "ARCHIVED"  # 已归档
    DELETED = "DELETED"  # 已删除


class ImageFile(Base):
    """影像文件表 - 记录所有上传的影像文件"""

    __tablename__ = "image_files"

    # 基本信息
    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="文件ID"
    )
    file_uuid: Mapped[typing.Any] = Column(
        String(64), unique=True, nullable=False, comment="文件UUID"
    )
    original_filename: Mapped[typing.Any] = Column(
        String(255), nullable=False, comment="原始文件名"
    )
    file_type: Mapped[ImageFileTypeEnum] = Column(
        Enum(ImageFileTypeEnum), nullable=False, comment="文件类型"
    )
    mime_type: Mapped[typing.Any] = Column(String(100), comment="MIME类型")

    # 对象存储信息
    storage_bucket: Mapped[typing.Any] = Column(
        String(128), nullable=False, comment="对象存储桶"
    )
    object_key: Mapped[typing.Any] = Column(
        String(500), nullable=False, comment="对象存储Key"
    )
    storage_etag: Mapped[typing.Any] = Column(String(128), comment="对象存储ETag")
    file_size: Mapped[int] = Column(
        BigInteger, nullable=False, comment="文件大小(字节)"
    )
    file_hash: Mapped[typing.Any] = Column(String(64), comment="文件MD5哈希值")

    # 缩略图信息
    thumbnail_path: Mapped[typing.Any] = Column(String(500), comment="缩略图路径")

    # 关联信息
    uploaded_by: Mapped[int] = Column(
        Integer, ForeignKey("users.id"), nullable=False, comment="上传用户ID"
    )
    patient_id: Mapped[int | None] = Column(
        Integer, ForeignKey("patients.id"), comment="关联患者ID"
    )

    # 影像元数据
    study_date: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="检查日期"
    )
    description: Mapped[str | None] = Column(Text, comment="文件描述")

    # 标注数据
    annotation: Mapped[typing.Any] = Column(JSON, comment="标注数据(JSON格式)")

    # 状态信息
    status: Mapped[ImageFileStatusEnum] = Column(
        Enum(ImageFileStatusEnum),
        nullable=False,
        default=ImageFileStatusEnum.UPLOADING,
        comment="文件状态",
    )
    upload_progress: Mapped[int | None] = Column(
        Integer, default=0, comment="上传进度(0-100)"
    )

    # 时间戳
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    uploaded_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="上传完成时间"
    )

    # 软删除
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(
        Integer, ForeignKey("users.id"), comment="删除人ID"
    )

    # 关系映射
    uploader: Mapped[User] = relationship(
        "User", foreign_keys=[uploaded_by], backref="uploaded_images"
    )
    deleter: Mapped[User | None] = relationship(
        "User", foreign_keys=[deleted_by], backref="deleted_images"
    )
    team_visibilities: Mapped[list[ImageFileTeamVisibility]] = relationship(
        "ImageFileTeamVisibility",
        back_populates="image_file",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> typing.Any:
        return f"<ImageFile(id={self.id}, filename={self.original_filename}, uploaded_by={self.uploaded_by})>"


class ImageFileTeamVisibility(Base):
    """团队对影像文件的可见归属。"""

    __tablename__ = "image_file_team_visibility"

    image_file_id: Mapped[int] = Column(
        Integer,
        ForeignKey("image_files.id"),
        primary_key=True,
        comment="影像文件ID",
    )
    team_id: Mapped[int] = Column(
        Integer,
        ForeignKey("teams.id"),
        primary_key=True,
        comment="团队ID",
    )
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, default=func.now(), nullable=False, comment="创建时间"
    )

    image_file: Mapped[ImageFile] = relationship(
        "ImageFile", back_populates="team_visibilities"
    )
    team: Mapped[Team] = relationship("Team")
