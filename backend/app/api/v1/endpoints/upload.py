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
from app.models.image import Study, Series, Instance, ModalityEnum, BodyPartEnum, StudyStatusEnum, SeriesStatusEnum, InstanceStatusEnum

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

def create_medical_imaging_records(
    db: Session,
    file_path: Path,
    file_size: int,
    patient_id: int,
    description: str,
    current_user_id: int
) -> tuple[Study, Series, Instance]:
    """创建医学影像相关的数据库记录"""

    # 确定影像模态和身体部位
    modality = determine_modality_from_description(description)
    body_part = determine_body_part_from_description(description)

    # 生成唯一标识符
    study_instance_uid = f"1.2.826.0.1.3680043.8.498.{uuid.uuid4().hex}"
    series_instance_uid = f"1.2.826.0.1.3680043.8.498.{uuid.uuid4().hex}"
    sop_instance_uid = f"1.2.826.0.1.3680043.8.498.{uuid.uuid4().hex}"

    # 生成Study ID
    study_count = db.query(Study).count()
    study_id = f"ST{study_count + 1:03d}"

    # 创建Study记录
    study = Study(
        study_instance_uid=study_instance_uid,
        study_id=study_id,
        patient_id=patient_id,
        study_date=date.today(),
        study_time=datetime.now().strftime("%H%M%S"),
        study_description=description or "上传的影像",
        modality=modality,
        body_part=body_part,
        series_count=1,
        instance_count=1,
        total_size=file_size,
        status=StudyStatusEnum.COMPLETED,
        created_by=current_user_id
    )
    db.add(study)
    db.flush()  # 获取study.id

    # 创建Series记录
    series = Series(
        series_instance_uid=series_instance_uid,
        series_number=1,
        study_id=study.id,
        series_date=date.today(),
        series_time=datetime.now().strftime("%H%M%S"),
        series_description=description or "上传的影像序列",
        modality=modality,
        body_part=body_part,
        instance_count=1,
        total_size=file_size,
        status=SeriesStatusEnum.RECEIVED,
        created_by=current_user_id
    )
    db.add(series)
    db.flush()  # 获取series.id

    # 创建Instance记录
    instance = Instance(
        sop_instance_uid=sop_instance_uid,
        instance_number=1,
        series_id=series.id,
        file_path=str(file_path),
        file_name=file_path.name,
        file_size=file_size,
        file_hash=calculate_file_hash(file_path),
        status=InstanceStatusEnum.UPLOADED,
        created_by=current_user_id
    )
    db.add(instance)

    return study, series, instance

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

        # 创建医学影像记录
        try:
            if patient_id and patient_id.isdigit():
                patient_id_int = int(patient_id)
                study, series, instance = create_medical_imaging_records(
                    db=db,
                    file_path=file_path,
                    file_size=actual_size,
                    patient_id=patient_id_int,
                    description=description or "上传的影像",
                    current_user_id=current_user.get('id')
                )
                db.commit()
                logger.info(f"医学影像记录创建成功: Study ID {study.study_id}, Patient ID {patient_id_int}")
            else:
                logger.warning(f"未提供有效的患者ID，跳过医学影像记录创建")
        except Exception as e:
            logger.error(f"创建医学影像记录失败: {e}")
            db.rollback()
            # 删除已上传的文件
            if file_path.exists():
                file_path.unlink()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="创建医学影像记录失败"
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


@router.get("/files/{study_id}", summary="获取影像文件")
async def get_study_file(
    study_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    根据Study ID获取对应的影像文件
    """
    try:
        # 查询study对应的instance记录
        instance = db.query(Instance).join(Series).join(Study).filter(
            Study.id == study_id
        ).first()

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        # 构建文件完整路径
        file_path = Path(instance.file_path)
        if not file_path.is_absolute():
            # 如果是相对路径，相对于backend目录
            # __file__ 是 backend/app/api/v1/endpoints/upload.py
            # 需要回到 backend/ 目录，所以是 .parent.parent.parent.parent.parent
            backend_dir = Path(__file__).parent.parent.parent.parent.parent
            file_path = backend_dir / file_path

        if not file_path.exists():
            logger.error(f"文件不存在: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        # 确定MIME类型
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"

        logger.info(f"返回影像文件: {file_path}, MIME: {mime_type}")

        return FileResponse(
            path=str(file_path),
            media_type=mime_type,
            filename=instance.file_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取影像文件失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像文件失败"
        )


@router.get("/files/instance/{instance_id}", summary="根据Instance ID获取影像文件")
async def get_instance_file(
    instance_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    根据Instance ID直接获取影像文件
    """
    try:
        # 查询instance记录
        instance = db.query(Instance).filter(Instance.id == instance_id).first()

        if not instance:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        # 构建文件完整路径
        file_path = Path(instance.file_path)
        if not file_path.is_absolute():
            # 如果是相对路径，相对于backend目录
            # __file__ 是 backend/app/api/v1/endpoints/upload.py
            # 需要回到 backend/ 目录，所以是 .parent.parent.parent.parent.parent
            backend_dir = Path(__file__).parent.parent.parent.parent.parent
            file_path = backend_dir / file_path

        if not file_path.exists():
            logger.error(f"文件不存在: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )

        # 确定MIME类型
        mime_type, _ = mimetypes.guess_type(str(file_path))
        if not mime_type:
            mime_type = "application/octet-stream"

        logger.info(f"返回影像文件: {file_path}, MIME: {mime_type}")

        return FileResponse(
            path=str(file_path),
            media_type=mime_type,
            filename=instance.file_name
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取影像文件失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像文件失败"
        )
