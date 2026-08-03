"""标注历史的 append-only SQLAlchemy 映射。"""

from __future__ import annotations

import datetime as datetime_types

from sqlalchemy import (
    JSON,
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.sql import func

from app.contexts.imaging.domain import JsonObject
from app.shared.database.sqlalchemy import Base


class ImageAnnotationRevision(Base):
    """一次成功标注变更后的完整快照。"""

    __tablename__ = "image_annotation_revisions"
    __table_args__ = (
        UniqueConstraint(
            "image_file_id",
            "version",
            name="uq_image_annotation_revision_version",
        ),
        Index(
            "idx_image_annotation_revisions_file_created",
            "image_file_id",
            "created_at",
        ),
    )

    id: Mapped[int] = Column(BigInteger, primary_key=True, autoincrement=True)
    image_file_id: Mapped[int] = Column(
        Integer, ForeignKey("image_files.id"), nullable=False
    )
    version: Mapped[int] = Column(BigInteger, nullable=False)
    snapshot: Mapped[JsonObject] = Column(JSON, nullable=False)
    source: Mapped[str] = Column(String(32), nullable=False)
    reason: Mapped[str] = Column(String(32), nullable=False)
    actor_id: Mapped[int | None] = Column(Integer, ForeignKey("users.id"))
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now()
    )

    item_events: Mapped[list[ImageAnnotationItemEvent]] = relationship(
        "ImageAnnotationItemEvent",
        back_populates="revision",
        cascade="all, delete-orphan",
    )


class ImageAnnotationItemEvent(Base):
    """一个用户可见标注项在某个 revision 中的变化。"""

    __tablename__ = "image_annotation_item_events"
    __table_args__ = (
        Index(
            "idx_annotation_item_events_identity",
            "image_file_id",
            "item_kind",
            "item_id",
            "revision_id",
        ),
    )

    id: Mapped[int] = Column(BigInteger, primary_key=True, autoincrement=True)
    revision_id: Mapped[int] = Column(
        BigInteger,
        ForeignKey("image_annotation_revisions.id", ondelete="CASCADE"),
        nullable=False,
    )
    image_file_id: Mapped[int] = Column(
        Integer, ForeignKey("image_files.id"), nullable=False
    )
    item_kind: Mapped[str] = Column(String(32), nullable=False)
    item_id: Mapped[str] = Column(String(128), nullable=False)
    action: Mapped[str] = Column(String(16), nullable=False)
    before_payload: Mapped[JsonObject | None] = Column(JSON)
    after_payload: Mapped[JsonObject | None] = Column(JSON)
    created_at: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, default=func.now()
    )

    revision: Mapped[ImageAnnotationRevision] = relationship(
        "ImageAnnotationRevision", back_populates="item_events"
    )
