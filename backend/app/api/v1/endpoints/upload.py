"""
文件上传API端点

支持大文件、分片上传、断点续传的文件上传功能

@author XieHe Medical System
@created 2025-09-24
"""

import os
import hashlib
import mimetypes
import uuid
from typing import List, Optional
from datetime import datetime, date
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.config import settings
from app.core.logging import get_logger
from app.models.image import ModalityEnum, BodyPartEnum
from app.models.image_file import ImageFile, ImageFileTypeEnum, ImageFileStatusEnum

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

def determine_modality_from_description(description: str) -> ModalityEnum:
    """根据检查描述确定影像模态"""
    description_lower = description.lower() if description else ""

    if any(keyword in description_lower for keyword in ['ct', '计算机断层', '断层']):
        return ModalityEnum.CT
    elif any(keyword in description_lower for keyword in ['mri', 'mr', '磁共振']):
        return ModalityEnum.MR
    elif any(keyword in description_lower for keyword in ['x光', 'x-ray', 'xr', '正位', '侧位', '曲位']):
        return ModalityEnum.XR
    elif any(keyword in description_lower for keyword in ['超声', 'us', 'ultrasound']):
        return ModalityEnum.US
    else:
        return ModalityEnum.OTHER

def determine_body_part_from_description(description: str) -> BodyPartEnum:
    """根据检查描述确定身体部位"""
    description_lower = description.lower() if description else ""

    if any(keyword in description_lower for keyword in ['头', '颅', '脑', 'head', 'brain']):
        return BodyPartEnum.HEAD
    elif any(keyword in description_lower for keyword in ['胸', 'chest', '肺', 'lung']):
        return BodyPartEnum.CHEST
    elif any(keyword in description_lower for keyword in ['腹', 'abdomen', '肝', '肾']):
        return BodyPartEnum.ABDOMEN
    elif any(keyword in description_lower for keyword in ['脊柱', 'spine', '椎']):
        return BodyPartEnum.SPINE
    elif any(keyword in description_lower for keyword in ['骨盆', 'pelvis']):
        return BodyPartEnum.PELVIS
    else:
        return BodyPartEnum.OTHER

# 已废弃：create_medical_imaging_records 函数已移除
# 现在使用 create_image_file_record 直接创建 ImageFile 记录

def create_image_file_record(
    db: Session,
    file_path: Path,
    original_filename: str,
    file_size: int,
    mime_type: str,
    uploaded_by: int,
    patient_id: Optional[int] = None,
    description: Optional[str] = None
) -> ImageFile:
    """创建影像文件记录"""

    # 确定文件类型
    ext = file_path.suffix.lower()
    if ext in ['.dcm', '.dicom']:
        file_type = ImageFileTypeEnum.DICOM
    elif ext in ['.jpg', '.jpeg']:
        file_type = ImageFileTypeEnum.JPEG
    elif ext in ['.png']:
        file_type = ImageFileTypeEnum.PNG
    elif ext in ['.tif', '.tiff']:
        file_type = ImageFileTypeEnum.TIFF
    else:
        file_type = ImageFileTypeEnum.OTHER

    # 生成UUID
    file_uuid = str(uuid.uuid4())

    # 计算相对路径
    try:
        storage_path = str(file_path.relative_to(UPLOAD_DIR))
    except ValueError:
        storage_path = str(file_path)

    # 计算文件哈希
    file_hash = calculate_file_hash(file_path)

    # 确定模态
    modality = None
    body_part = None
    if description:
        mod_enum = determine_modality_from_description(description)
        modality = mod_enum.value if mod_enum else None
        body_enum = determine_body_part_from_description(description)
        body_part = body_enum.value if body_enum else None

    # 创建记录
    image_file = ImageFile(
        file_uuid=file_uuid,
        original_filename=original_filename,
        file_type=file_type,
        mime_type=mime_type,
        storage_path=storage_path,
        file_size=file_size,
        file_hash=file_hash,
        uploaded_by=uploaded_by,
        patient_id=patient_id,
        modality=modality,
        body_part=body_part,
        study_date=datetime.now(),
        description=description,
        status=ImageFileStatusEnum.UPLOADED,
        upload_progress=100,
        uploaded_at=datetime.now()
    )

    db.add(image_file)
    return image_file

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
@router.post("/single", response_model=FileUploadResponse)
async def upload_single_file(
    file: UploadFile = File(...),
    patient_id: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user),
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

        # 创建影像文件记录
        try:
            patient_id_int = int(patient_id) if patient_id and patient_id.isdigit() else None

            image_file = create_image_file_record(
                db=db,
                file_path=file_path,
                original_filename=file.filename,
                file_size=actual_size,
                mime_type=file.content_type,
                uploaded_by=current_user.get('id'),
                patient_id=patient_id_int,
                description=description
            )
            db.commit()
            logger.info(f"影像文件记录创建成功: File UUID {image_file.file_uuid}, Patient ID {patient_id_int}")
            
        except Exception as e:
            logger.error(f"创建数据库记录失败: {e}")
            db.rollback()
            # 删除已上传的文件
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建数据库记录失败"
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

@router.post("/chunk", response_model=ChunkUploadResponse)
async def upload_chunk(
    chunk_data: ChunkUploadRequest,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_active_user)
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

@router.post("/complete/{file_id}")
async def complete_upload(
    file_id: str,
    filename: str = Form(...),
    file_hash: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_active_user)
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

@router.get("/status/{file_id}", response_model=FileUploadStatus)
async def get_upload_status(
    file_id: str,
    current_user: dict = Depends(get_current_active_user)
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

@router.get("/records", summary="获取文件上传记录")
async def get_upload_records(
    page: int = 1,
    page_size: int = 20,
    patient_id: Optional[int] = None,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取文件上传记录

    返回用户的文件上传历史记录
    """
    try:
        # 构建查询条件
        where_conditions = ["is_deleted = 0"]
        params = {}

        if patient_id:
            where_conditions.append("patient_id = :patient_id")
            params['patient_id'] = patient_id

        # 只显示当前用户上传的文件
        where_conditions.append("uploaded_by = :uploaded_by")
        params['uploaded_by'] = current_user.get('id')

        where_clause = " AND ".join(where_conditions)

        # 获取总数
        count_sql = f"SELECT COUNT(*) FROM file_uploads WHERE {where_clause}"
        total = db.execute(text(count_sql), params).scalar() or 0

        # 获取记录
        offset = (page - 1) * page_size
        records_sql = f"""
        SELECT file_id, original_filename, file_size, file_type, mime_type,
               upload_status, patient_id, uploaded_at, description
        FROM file_uploads
        WHERE {where_clause}
        ORDER BY uploaded_at DESC
        LIMIT :limit OFFSET :offset
        """

        params.update({'limit': page_size, 'offset': offset})
        records = db.execute(text(records_sql), params).fetchall()

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "records": [
                {
                    "file_id": record[0],
                    "filename": record[1],
                    "file_size": record[2],
                    "file_type": record[3],
                    "mime_type": record[4],
                    "upload_status": record[5],
                    "patient_id": record[6],
                    "uploaded_at": record[7],
                    "description": record[8]
                }
                for record in records
            ]
        }

    except Exception as e:
        logger.error(f"获取上传记录失败: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取上传记录失败"
        )


# 已废弃的API端点已移除：
# - GET /files/{study_id} - 根据Study ID获取影像文件
# - GET /files/instance/{instance_id} - 根据Instance ID获取影像文件
#
# 请使用新的API端点：
# - GET /api/v1/image-files/{file_id}/download - 根据ImageFile ID下载文件
