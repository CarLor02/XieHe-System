"""Persistent batch image import models."""

from __future__ import annotations

import datetime as datetime_types
import enum
import typing
from typing import TYPE_CHECKING

from sqlalchemy import (
    JSON,
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, relationship

from app.shared.database.sqlalchemy import Base

if TYPE_CHECKING:
    from .image_file import ImageFile


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

    id: Mapped[int] = Column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[typing.Any] = Column(String(64), unique=True, nullable=False)
    uploaded_by: Mapped[int] = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id: Mapped[int] = Column(Integer, ForeignKey("patients.id"), nullable=False)
    description: Mapped[str | None] = Column(Text)
    team_ids: Mapped[typing.Any] = Column(JSON, nullable=False)
    status: Mapped[typing.Any] = Column(
        String(32), nullable=False, default=ImageImportBatchStatus.UPLOADING.value
    )
    total_items: Mapped[int] = Column(Integer, nullable=False, default=0)
    uploaded_items: Mapped[int] = Column(Integer, nullable=False, default=0)
    succeeded_items: Mapped[int] = Column(Integer, nullable=False, default=0)
    failed_items: Mapped[int] = Column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now()
    )
    updated_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime_types.datetime | None] = Column(DateTime)

    items: Mapped[list[ImageImportItem]] = relationship(
        "ImageImportItem",
        back_populates="batch",
        cascade="all, delete-orphan",
        order_by="ImageImportItem.id",
    )


class ImageImportItem(Base):
    """One image and its upload/AI state inside a batch."""

    __tablename__ = "image_import_items"
    __table_args__ = (
        UniqueConstraint(
            "batch_id", "client_file_id", name="uq_image_import_item_client"
        ),
    )

    id: Mapped[int] = Column(Integer, primary_key=True, autoincrement=True)
    batch_id: Mapped[int] = Column(
        Integer, ForeignKey("image_import_batches.id"), nullable=False
    )
    client_file_id: Mapped[typing.Any] = Column(String(128), nullable=False)
    filename: Mapped[typing.Any] = Column(String(255), nullable=False)
    size: Mapped[int] = Column(BigInteger, nullable=False)
    mime_type: Mapped[typing.Any] = Column(String(100), nullable=False)
    file_hash: Mapped[typing.Any] = Column(String(64))
    image_file_id: Mapped[int | None] = Column(Integer, ForeignKey("image_files.id"))
    upload_id: Mapped[typing.Any] = Column(String(255))
    upload_status: Mapped[typing.Any] = Column(
        String(32),
        nullable=False,
        default=ImageImportUploadStatus.PENDING.value,
    )
    ai_status: Mapped[typing.Any] = Column(
        String(32),
        nullable=False,
        default=ImageImportAiStatus.PENDING.value,
    )
    error_message: Mapped[str | None] = Column(Text)
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now()
    )
    updated_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )

    batch: Mapped[ImageImportBatch] = relationship(
        "ImageImportBatch", back_populates="items"
    )
    image_file: Mapped[ImageFile | None] = relationship("ImageFile")
