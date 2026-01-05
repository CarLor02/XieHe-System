"""
影像文件管理API

提供影像文件的查询、列表、下载等功能
支持按用户、患者、日期等条件查询

作者: XieHe Medical System
创建时间: 2026-01-05
"""

from typing import List, Optional
from datetime import datetime, date
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.config import settings
from app.core.logging import get_logger
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.user import User

logger = get_logger(__name__)
router = APIRouter()


# Pydantic 模型
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
    study_id: Optional[int]
    modality: Optional[str]
    body_part: Optional[str]
    study_date: Optional[datetime]
    description: Optional[str]
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


# API 端点
@router.get("/my-images", response_model=ImageFileListResponse, summary="获取当前用户的影像文件")
async def get_my_images(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    file_type: Optional[ImageFileTypeEnum] = Query(None, description="文件类型"),
    file_status: Optional[ImageFileStatusEnum] = Query(None, description="文件状态"),
    modality: Optional[str] = Query(None, description="影像模态"),
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    search: Optional[str] = Query(None, description="搜索关键词(文件名)"),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户上传的所有影像文件
    
    支持分页、筛选和搜索
    """
    try:
        # 构建查询
        query = db.query(ImageFile).filter(
            ImageFile.uploaded_by == current_user.get('id'),
            ImageFile.is_deleted == False
        )
        
        # 应用筛选条件
        if file_type:
            query = query.filter(ImageFile.file_type == file_type)
        
        if file_status:
            query = query.filter(ImageFile.status == file_status)
            
        if modality:
            query = query.filter(ImageFile.modality == modality)
            
        if start_date:
            query = query.filter(ImageFile.created_at >= start_date)
            
        if end_date:
            end_datetime = datetime.combine(end_date, datetime.max.time())
            query = query.filter(ImageFile.created_at <= end_datetime)
            
        if search:
            query = query.filter(ImageFile.original_filename.like(f"%{search}%"))
        
        # 获取总数
        total = query.count()
        
        # 分页查询
        images = query.order_by(desc(ImageFile.created_at)).offset((page - 1) * page_size).limit(page_size).all()
        
        # 获取上传者信息
        items = []
        for img in images:
            img_dict = {
                "id": img.id,
                "file_uuid": img.file_uuid,
                "original_filename": img.original_filename,
                "file_type": img.file_type.value,
                "mime_type": img.mime_type,
                "file_size": img.file_size,
                "storage_path": img.storage_path,
                "thumbnail_path": img.thumbnail_path,
                "uploaded_by": img.uploaded_by,
                "uploader_name": None,
                "patient_id": img.patient_id,
                "study_id": img.study_id,
                "modality": img.modality,
                "body_part": img.body_part,
                "study_date": img.study_date,
                "description": img.description,
                "status": img.status.value,
                "upload_progress": img.upload_progress,
                "created_at": img.created_at,
                "uploaded_at": img.uploaded_at
            }
            
            # 获取上传者姓名
            if img.uploaded_by:
                uploader = db.query(User).filter(User.id == img.uploaded_by).first()
                if uploader:
                    img_dict["uploader_name"] = uploader.username
            
            items.append(ImageFileResponse(**img_dict))
        
        return ImageFileListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=items
        )
        
    except Exception as e:
        logger.error(f"获取影像文件列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像文件列表失败"
        )


@router.get("/patient/{patient_id}", response_model=ImageFileListResponse, summary="获取患者的影像文件")
async def get_patient_images(
    patient_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定患者的所有影像文件
    """
    try:
        # 构建查询
        query = db.query(ImageFile).filter(
            ImageFile.patient_id == patient_id,
            ImageFile.is_deleted == False
        )
        
        total = query.count()
        images = query.order_by(desc(ImageFile.created_at)).offset((page - 1) * page_size).limit(page_size).all()
        
        items = []
        for img in images:
            img_dict = {
                "id": img.id,
                "file_uuid": img.file_uuid,
                "original_filename": img.original_filename,
                "file_type": img.file_type.value,
                "mime_type": img.mime_type,
                "file_size": img.file_size,
                "storage_path": img.storage_path,
                "thumbnail_path": img.thumbnail_path,
                "uploaded_by": img.uploaded_by,
                "patient_id": img.patient_id,
                "study_id": img.study_id,
                "modality": img.modality,
                "body_part": img.body_part,
                "study_date": img.study_date,
                "description": img.description,
                "status": img.status.value,
                "upload_progress": img.upload_progress,
                "created_at": img.created_at,
                "uploaded_at": img.uploaded_at
            }
            items.append(ImageFileResponse(**img_dict))
        
        return ImageFileListResponse(
            total=total,
            page=page,
            page_size=page_size,
            items=items
        )
        
    except Exception as e:
        logger.error(f"获取患者影像文件失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取患者影像文件失败"
        )


@router.get("/{file_id}", response_model=ImageFileResponse, summary="获取影像文件详情")
async def get_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定影像文件的详细信息
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )
        
        # 构建响应
        img_dict = {
            "id": image.id,
            "file_uuid": image.file_uuid,
            "original_filename": image.original_filename,
            "file_type": image.file_type.value,
            "mime_type": image.mime_type,
            "file_size": image.file_size,
            "storage_path": image.storage_path,
            "thumbnail_path": image.thumbnail_path,
            "uploaded_by": image.uploaded_by,
            "patient_id": image.patient_id,
            "study_id": image.study_id,
            "modality": image.modality,
            "body_part": image.body_part,
            "study_date": image.study_date,
            "description": image.description,
            "status": image.status.value,
            "upload_progress": image.upload_progress,
            "created_at": image.created_at,
            "uploaded_at": image.uploaded_at
        }
        
        # 获取上传者信息
        if image.uploaded_by:
            uploader = db.query(User).filter(User.id == image.uploaded_by).first()
            if uploader:
                img_dict["uploader_name"] = uploader.username
        
        return ImageFileResponse(**img_dict)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取影像文件详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像文件详情失败"
        )


@router.get("/{file_id}/download", summary="下载影像文件")
async def download_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    下载指定的影像文件
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )
        
        # 构建文件路径
        file_path = Path(settings.UPLOAD_DIR) / image.storage_path
        
        if not file_path.exists():
            logger.error(f"文件不存在: {file_path}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="文件不存在"
            )
        
        return FileResponse(
            path=str(file_path),
            filename=image.original_filename,
            media_type=image.mime_type or "application/octet-stream"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"下载影像文件失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="下载影像文件失败"
        )


@router.delete("/{file_id}", summary="删除影像文件")
async def delete_image_file(
    file_id: int,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    软删除指定的影像文件
    """
    try:
        image = db.query(ImageFile).filter(
            ImageFile.id == file_id,
            ImageFile.is_deleted == False
        ).first()
        
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像文件不存在"
            )
        
        # 检查权限：只能删除自己上传的文件
        if image.uploaded_by != current_user.get('id'):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="无权删除此文件"
            )
        
        # 软删除
        image.is_deleted = True
        image.deleted_at = datetime.now()
        image.deleted_by = current_user.get('id')
        
        db.commit()
        
        return {"message": "影像文件已删除", "file_id": file_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除影像文件失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除影像文件失败"
        )


@router.get("/stats/summary", response_model=ImageFileStatsResponse, summary="获取影像文件统计")
async def get_image_stats(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取当前用户的影像文件统计信息
    """
    try:
        user_id = current_user.get('id')
        
        # 总文件数和总大小
        images = db.query(ImageFile).filter(
            ImageFile.uploaded_by == user_id,
            ImageFile.is_deleted == False
        ).all()
        
        total_files = len(images)
        total_size = sum(img.file_size for img in images)
        
        # 按类型统计
        by_type = {}
        for img in images:
            file_type = img.file_type.value
            by_type[file_type] = by_type.get(file_type, 0) + 1
        
        # 按状态统计
        by_status = {}
        for img in images:
            img_status = img.status.value
            by_status[img_status] = by_status.get(img_status, 0) + 1
        
        # 按模态统计
        by_modality = {}
        for img in images:
            if img.modality:
                by_modality[img.modality] = by_modality.get(img.modality, 0) + 1
        
        return ImageFileStatsResponse(
            total_files=total_files,
            total_size=total_size,
            by_type=by_type,
            by_status=by_status,
            by_modality=by_modality
        )
        
    except Exception as e:
        logger.error(f"获取影像统计失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像统计失败"
        )
