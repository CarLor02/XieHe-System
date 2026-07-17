"""Persistent batch image import models."""

from __future__ import annotations

import enum

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship

from .base import Base


class ImageImportBatchStatus(str, enum.Enum):
    UPLOADING = "UPLOADING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    PARTIAL_FAILED = "PARTIAL_FAILED"
    FAILED = "FAILED"


class ImageImportUploadStatus(str, enum.Enum):
    PENDING = "PENDING"
    SESSION_CREATED = "SESSION_CREATED"
    UPLOADING = "UPLOADING"
    UPLOADED = "UPLOADED"
    FAILED = "FAILED"


class ImageImportAiStatus(str, enum.Enum):
    PENDING = "PENDING"
    QUEUED = "QUEUED"
    RUNNING = "RUNNING"
    SUCCEEDED = "SUCCEEDED"
    FAILED = "FAILED"


class ImageImportBatch(Base):
    """One browser-created batch import."""

    __tablename__ = "image_import_batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(String(64), unique=True, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    description = Column(Text)
    team_ids = Column(JSON, nullable=False)
    status = Column(String(32), nullable=False, default=ImageImportBatchStatus.UPLOADING.value)
    total_items = Column(Integer, nullable=False, default=0)
    uploaded_items = Column(Integer, nullable=False, default=0)
    succeeded_items = Column(Integer, nullable=False, default=0)
    failed_items = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())
    completed_at = Column(DateTime)

    items = relationship(
        "ImageImportItem",
        back_populates="batch",
        cascade="all, delete-orphan",
        order_by="ImageImportItem.id",
    )


class ImageImportItem(Base):
    """One image and its upload/AI state inside a batch."""

    __tablename__ = "image_import_items"
    __table_args__ = (
        UniqueConstraint("batch_id", "client_file_id", name="uq_image_import_item_client"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    batch_id = Column(Integer, ForeignKey("image_import_batches.id"), nullable=False)
    client_file_id = Column(String(128), nullable=False)
    filename = Column(String(255), nullable=False)
    size = Column(BigInteger, nullable=False)
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64))
    image_file_id = Column(Integer, ForeignKey("image_files.id"))
    upload_id = Column(String(255))
    upload_status = Column(
        String(32),
        nullable=False,
        default=ImageImportUploadStatus.PENDING.value,
    )
    ai_status = Column(
        String(32),
        nullable=False,
        default=ImageImportAiStatus.PENDING.value,
    )
    error_message = Column(Text)
    created_at = Column(DateTime, nullable=False, default=func.now())
    updated_at = Column(DateTime, nullable=False, default=func.now(), onupdate=func.now())

    batch = relationship("ImageImportBatch", back_populates="items")
    image_file = relationship("ImageFile")
