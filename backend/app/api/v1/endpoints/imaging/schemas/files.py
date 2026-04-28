"""Schemas for the files API endpoints."""

from typing import List, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field

class ImageFileResponse(BaseModel):
    """影像文件响应模型"""
    id: int
    file_uuid: str
    original_filename: str
    file_type: str
    mime_type: Optional[str]
    file_size: int
    storage_path: str
    thumbnail_path: Optional[str]
    uploaded_by: int
    uploader_name: Optional[str] = None
    patient_id: Optional[int]
    modality: Optional[str]
    body_part: Optional[str]
    study_date: Optional[datetime]
    description: Optional[str]
    annotation: Optional[str] = None
    status: str
    upload_progress: int
    created_at: datetime
    uploaded_at: Optional[datetime]

    class Config:
        from_attributes = True


class ImageFileListResponse(BaseModel):
    """影像文件列表响应"""
    total: int
    page: int
    page_size: int
    items: List[ImageFileResponse]


class ImageFileStatsResponse(BaseModel):
    """影像文件统计响应"""
    total_files: int
    total_size: int
    by_type: dict
    by_status: dict
    by_modality: dict


class UpdateExamTypeRequest(BaseModel):
    """修改检查类型请求模型"""
    description: str = Field(..., description="检查类型（正位X光片/侧位X光片等）")


class UpdateAnnotationRequest(BaseModel):
    """更新标注数据请求模型"""
    annotation: str = Field(..., description="标注数据(JSON字符串)")
