"""Schemas for the export API endpoints."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from pydantic import BaseModel, Field

class ExportRequest(BaseModel):
    """导出请求"""
    report_ids: List[int] = Field(..., description="报告ID列表")
    format: str = Field(..., description="导出格式", pattern="^(pdf|word|image|html)$")
    template: Optional[str] = Field(None, description="导出模板")
    include_images: bool = Field(True, description="是否包含图片")
    watermark: Optional[str] = Field(None, description="水印文本")


class BatchExportRequest(BaseModel):
    """批量导出请求"""
    filters: Dict[str, Any] = Field({}, description="筛选条件")
    format: str = Field(..., description="导出格式", pattern="^(pdf|word|image|html)$")
    template: Optional[str] = Field(None, description="导出模板")
    include_images: bool = Field(True, description="是否包含图片")
    watermark: Optional[str] = Field(None, description="水印文本")
    max_reports: int = Field(100, description="最大导出数量", le=1000)


class ExportResponse(BaseModel):
    """导出响应"""
    task_id: str
    status: str
    message: str
    download_url: Optional[str] = None
    file_size: Optional[int] = None
    created_at: datetime
