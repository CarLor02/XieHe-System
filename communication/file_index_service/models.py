"""
ORM 模型（SQLAlchemy）+ Pydantic 响应模型
"""

from datetime import datetime
from typing import Optional, List

from sqlalchemy import Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from database import Base
from pydantic import BaseModel


# ── ORM ───────────────────────────────────────────────────────────────────────

class ScanFile(Base):
    __tablename__ = "scan_files"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # 文件夹层级
    month_folder: Mapped[str] = mapped_column(String, index=True)       # e.g. "202601"
    patient_folder: Mapped[str] = mapped_column(String, index=True)     # e.g. "6-1-1"

    # 文件信息
    filename: Mapped[str] = mapped_column(String)                        # e.g. "6-1-1-001"
    file_path: Mapped[str] = mapped_column(String, unique=True, index=True)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    file_mtime: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    scan_index: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # "001"
    file_hash: Mapped[Optional[str]] = mapped_column(String, nullable=True)   # md5前8位

    # 文件类型标记
    is_primary: Mapped[bool] = mapped_column(Boolean, default=True)     # 主影像(无扩展名/.dcm)
    extension: Mapped[Optional[str]] = mapped_column(String, nullable=True)  # ".sml" / ""

    # 有效性
    is_valid: Mapped[bool] = mapped_column(Boolean, default=True)        # 文件当前是否存在可读

    # 同步状态
    is_synced: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    sync_note: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # 时间戳
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=func.now(), onupdate=func.now())


# ── Pydantic 响应模型 ──────────────────────────────────────────────────────────

class ScanFileResponse(BaseModel):
    id: int
    month_folder: str
    patient_folder: str
    filename: str
    file_path: str
    file_size: int
    file_mtime: Optional[datetime]
    scan_index: Optional[str]
    is_primary: bool
    extension: Optional[str]
    is_valid: bool
    is_synced: bool
    synced_at: Optional[datetime]
    sync_note: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientSummary(BaseModel):
    month_folder: str
    patient_folder: str
    total_files: int
    primary_files: int
    synced_files: int
    unsynced_primary: int


class FileListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[ScanFileResponse]


class BatchMarkSyncedRequest(BaseModel):
    file_ids: List[int]
    sync_note: Optional[str] = None


class BatchMarkSyncedResponse(BaseModel):
    updated: int
    file_ids: List[int]


class ScanTriggerResponse(BaseModel):
    message: str
    new_files: int
    updated_files: int
    invalid_files: int
    duration_seconds: float
