"""Schemas for the uploads API endpoints."""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

class FileUploadResponse(BaseModel):
    """文件上传响应"""
    file_id: str
    filename: str
    size: int
    mime_type: str
    upload_url: str
    status: str = "uploaded"
    created_at: datetime


class ChunkUploadRequest(BaseModel):
    """分片上传请求"""
    file_id: str = Field(..., description="文件唯一标识")
    chunk_index: int = Field(..., ge=0, description="分片索引")
    total_chunks: int = Field(..., gt=0, description="总分片数")
    chunk_hash: str = Field(..., description="分片MD5哈希")
    file_hash: Optional[str] = Field(None, description="完整文件MD5哈希")


class ChunkUploadResponse(BaseModel):
    """分片上传响应"""
    file_id: str
    chunk_index: int
    status: str
    uploaded_chunks: List[int]
    missing_chunks: List[int]
    is_complete: bool


class FileUploadStatus(BaseModel):
    """文件上传状态"""
    file_id: str
    filename: str
    total_size: int
    uploaded_size: int
    total_chunks: int
    uploaded_chunks: List[int]
    missing_chunks: List[int]
    status: str
    progress: float
