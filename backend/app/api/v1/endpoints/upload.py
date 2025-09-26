"""
文件上传API端点

支持大文件、分片上传、断点续传的文件上传功能

@author XieHe Medical System
@created 2025-09-24
"""

import os
import hashlib
import mimetypes
from typing import List, Optional
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# 配置
UPLOAD_DIR = Path(settings.UPLOAD_DIR)
CHUNK_SIZE = 1024 * 1024 * 5  # 5MB chunks
MAX_FILE_SIZE = 1024 * 1024 * 1024 * 2  # 2GB max file size
ALLOWED_EXTENSIONS = {'.dcm', '.dicom', '.jpg', '.jpeg', '.png', '.tiff', '.tif'}
ALLOWED_MIME_TYPES = {
    'application/dicom',
    'image/jpeg',
    'image/png', 
    'image/tiff',
    'image/x-tiff'
}

# 确保上传目录存在
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / 'chunks').mkdir(exist_ok=True)
(UPLOAD_DIR / 'completed').mkdir(exist_ok=True)

# Pydantic模型
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

# 工具函数
def generate_file_id(filename: str, size: int) -> str:
    """生成文件唯一标识"""
    content = f"{filename}_{size}_{datetime.now().isoformat()}"
    return hashlib.md5(content.encode()).hexdigest()

def calculate_file_hash(file_path: Path) -> str:
    """计算文件MD5哈希"""
    hash_md5 = hashlib.md5()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            hash_md5.update(chunk)
    return hash_md5.hexdigest()

def validate_file_type(filename: str, content_type: str) -> bool:
    """验证文件类型"""
    # 检查文件扩展名
    file_ext = Path(filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        return False
    
    # 检查MIME类型
    if content_type not in ALLOWED_MIME_TYPES:
        return False
    
    return True

def get_chunk_path(file_id: str, chunk_index: int) -> Path:
    """获取分片文件路径"""
    return UPLOAD_DIR / 'chunks' / f"{file_id}_{chunk_index}"

def get_completed_file_path(file_id: str, filename: str) -> Path:
    """获取完成文件路径"""
    # 使用时间戳避免文件名冲突
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    name, ext = os.path.splitext(filename)
    safe_filename = f"{name}_{timestamp}{ext}"
    return UPLOAD_DIR / 'completed' / safe_filename

# API端点
@router.post("/upload/single", response_model=FileUploadResponse)
async def upload_single_file(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    单文件上传
    
    支持小文件的直接上传
    """
    try:
        # 验证文件大小
        if file.size and file.size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"文件大小超过限制 ({MAX_FILE_SIZE / 1024 / 1024 / 1024:.1f}GB)"
            )
        
        # 验证文件类型
        if not validate_file_type(file.filename, file.content_type):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="不支持的文件类型"
            )
        
        # 生成文件ID
        file_id = generate_file_id(file.filename, file.size or 0)
        
        # 保存文件
        file_path = get_completed_file_path(file_id, file.filename)
        
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # 验证文件完整性
        actual_size = file_path.stat().st_size
        if file.size and actual_size != file.size:
            file_path.unlink()  # 删除不完整的文件
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="文件上传不完整"
            )
        
        logger.info(f"文件上传成功: {file.filename} ({actual_size} bytes)")
        
        return FileUploadResponse(
            file_id=file_id,
            filename=file.filename,
            size=actual_size,
            mime_type=file.content_type,
            upload_url=f"/api/v1/files/{file_id}",
            created_at=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"文件上传失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="文件上传失败"
        )

@router.post("/upload/chunk", response_model=ChunkUploadResponse)
async def upload_chunk(
    chunk_data: ChunkUploadRequest,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user)
):
    """
    分片上传
    
    支持大文件的分片上传和断点续传
    """
    try:
        file_id = chunk_data.file_id
        chunk_index = chunk_data.chunk_index
        
        # 验证分片数据
        chunk_content = await file.read()
        chunk_hash = hashlib.md5(chunk_content).hexdigest()
        
        if chunk_hash != chunk_data.chunk_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="分片数据校验失败"
            )
        
        # 保存分片
        chunk_path = get_chunk_path(file_id, chunk_index)
        with open(chunk_path, "wb") as f:
            f.write(chunk_content)
        
        # 检查已上传的分片
        uploaded_chunks = []
        missing_chunks = []
        
        for i in range(chunk_data.total_chunks):
            chunk_file = get_chunk_path(file_id, i)
            if chunk_file.exists():
                uploaded_chunks.append(i)
            else:
                missing_chunks.append(i)
        
        is_complete = len(uploaded_chunks) == chunk_data.total_chunks
        
        logger.info(f"分片上传: {file_id} chunk {chunk_index}/{chunk_data.total_chunks}")
        
        return ChunkUploadResponse(
            file_id=file_id,
            chunk_index=chunk_index,
            status="chunk_uploaded",
            uploaded_chunks=uploaded_chunks,
            missing_chunks=missing_chunks,
            is_complete=is_complete
        )
        
    except Exception as e:
        logger.error(f"分片上传失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="分片上传失败"
        )

@router.post("/upload/complete/{file_id}")
async def complete_upload(
    file_id: str,
    filename: str = Form(...),
    file_hash: Optional[str] = Form(None),
    current_user = Depends(get_current_user)
):
    """
    完成分片上传
    
    合并所有分片为完整文件
    """
    try:
        # 获取所有分片文件
        chunk_files = []
        chunk_index = 0
        
        while True:
            chunk_path = get_chunk_path(file_id, chunk_index)
            if not chunk_path.exists():
                break
            chunk_files.append(chunk_path)
            chunk_index += 1
        
        if not chunk_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="未找到分片文件"
            )
        
        # 合并分片
        completed_path = get_completed_file_path(file_id, filename)
        
        with open(completed_path, "wb") as output_file:
            for chunk_path in chunk_files:
                with open(chunk_path, "rb") as chunk_file:
                    output_file.write(chunk_file.read())
        
        # 验证文件完整性
        if file_hash:
            actual_hash = calculate_file_hash(completed_path)
            if actual_hash != file_hash:
                completed_path.unlink()  # 删除不完整的文件
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="文件完整性校验失败"
                )
        
        # 清理分片文件
        for chunk_path in chunk_files:
            try:
                chunk_path.unlink()
            except Exception as e:
                logger.warning(f"清理分片文件失败: {e}")
        
        file_size = completed_path.stat().st_size
        mime_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
        
        logger.info(f"文件合并完成: {filename} ({file_size} bytes)")
        
        return FileUploadResponse(
            file_id=file_id,
            filename=filename,
            size=file_size,
            mime_type=mime_type,
            upload_url=f"/api/v1/files/{file_id}",
            created_at=datetime.now()
        )
        
    except Exception as e:
        logger.error(f"文件合并失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="文件合并失败"
        )

@router.get("/upload/status/{file_id}", response_model=FileUploadStatus)
async def get_upload_status(
    file_id: str,
    current_user = Depends(get_current_user)
):
    """
    获取上传状态
    
    查询文件上传进度和状态
    """
    try:
        # 检查是否已完成
        completed_files = list((UPLOAD_DIR / 'completed').glob(f"*{file_id}*"))
        if completed_files:
            file_path = completed_files[0]
            file_size = file_path.stat().st_size
            
            return FileUploadStatus(
                file_id=file_id,
                filename=file_path.name,
                total_size=file_size,
                uploaded_size=file_size,
                total_chunks=1,
                uploaded_chunks=[0],
                missing_chunks=[],
                status="completed",
                progress=100.0
            )
        
        # 检查分片状态
        chunk_files = list((UPLOAD_DIR / 'chunks').glob(f"{file_id}_*"))
        if not chunk_files:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="未找到上传记录"
            )
        
        # 分析分片状态
        uploaded_chunks = []
        total_size = 0
        
        for chunk_file in chunk_files:
            chunk_index = int(chunk_file.name.split('_')[-1])
            uploaded_chunks.append(chunk_index)
            total_size += chunk_file.stat().st_size
        
        uploaded_chunks.sort()
        max_chunk = max(uploaded_chunks) if uploaded_chunks else 0
        missing_chunks = [i for i in range(max_chunk + 1) if i not in uploaded_chunks]
        
        progress = len(uploaded_chunks) / (max_chunk + 1) * 100 if max_chunk >= 0 else 0
        
        return FileUploadStatus(
            file_id=file_id,
            filename=f"upload_{file_id}",
            total_size=total_size,
            uploaded_size=total_size,
            total_chunks=max_chunk + 1,
            uploaded_chunks=uploaded_chunks,
            missing_chunks=missing_chunks,
            status="uploading",
            progress=progress
        )
        
    except Exception as e:
        logger.error(f"获取上传状态失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取上传状态失败"
        )
