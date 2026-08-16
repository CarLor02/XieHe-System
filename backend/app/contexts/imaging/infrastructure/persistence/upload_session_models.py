"""SQLAlchemy model for durable image upload sessions."""

from __future__ import annotations

import datetime as datetime_types
import typing

from sqlalchemy import (
    JSON,
    BigInteger,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped

from app.contexts.imaging.domain import ImageFileTypeEnum
from app.shared.database.sqlalchemy import Base


class ImageUploadSession(Base):
    __tablename__ = "image_upload_sessions"
    __table_args__ = (
        UniqueConstraint("session_id", name="uq_image_upload_session_public_id"),
        UniqueConstraint("image_file_id", name="uq_image_upload_session_image"),
        Index("idx_image_upload_session_status_expiry", "status", "expires_at"),
        Index("idx_image_upload_session_batch_item", "batch_item_id"),
    )

    id: Mapped[int] = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = Column(String(64), nullable=False)
    source_type: Mapped[str] = Column(String(32), nullable=False)
    batch_item_id: Mapped[int | None] = Column(
        Integer, ForeignKey("image_import_items.id"), nullable=True
    )
    image_file_id: Mapped[int | None] = Column(
        Integer, ForeignKey("image_files.id"), nullable=True
    )
    status: Mapped[str] = Column(String(32), nullable=False)
    file_uuid: Mapped[str] = Column(String(64), nullable=False)
    original_filename: Mapped[str] = Column(String(255), nullable=False)
    file_type: Mapped[ImageFileTypeEnum] = Column(
        Enum(ImageFileTypeEnum), nullable=False
    )
    mime_type: Mapped[str] = Column(String(100), nullable=False)
    expected_size: Mapped[int] = Column(BigInteger, nullable=False)
    expected_hash: Mapped[str | None] = Column(String(64))
    storage_bucket: Mapped[str] = Column(String(128), nullable=False)
    object_key: Mapped[str] = Column(String(500), nullable=False)
    upload_id: Mapped[str | None] = Column(String(255))
    storage_etag: Mapped[str | None] = Column(String(128))
    uploaded_by: Mapped[int] = Column(Integer, ForeignKey("users.id"), nullable=False)
    patient_id: Mapped[int | None] = Column(Integer, ForeignKey("patients.id"))
    description: Mapped[str | None] = Column(Text)
    team_ids: Mapped[typing.Any] = Column(JSON, nullable=False)
    expires_at: Mapped[datetime_types.datetime | None] = Column(DateTime)
    completion_lease_expires_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime
    )
    last_error: Mapped[str | None] = Column(Text)
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now()
    )
    updated_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now(), onupdate=func.now()
    )
    completed_at: Mapped[datetime_types.datetime | None] = Column(DateTime)
