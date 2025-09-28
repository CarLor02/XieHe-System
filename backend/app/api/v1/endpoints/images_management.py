"""
影像管理API端点

实现影像文件的增删改查、上传、列表等核心功能

@author XieHe Medical System
@created 2025-09-28
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from pydantic import BaseModel, Field
import uuid
import os

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.exceptions import BusinessLogicException, ResourceNotFoundException
from app.core.logging import get_logger
from app.models.image import Study, Series, Instance, StudyStatusEnum, SeriesStatusEnum, InstanceStatusEnum
from app.models.patient import Patient

logger = get_logger(__name__)
router = APIRouter()

# Pydantic模型定义
class StudyResponse(BaseModel):
    """检查响应模型"""
    id: int
    study_instance_uid: str
    study_id: Optional[str]
    patient_id: int
    patient_name: Optional[str]
    study_description: Optional[str]
    modality: Optional[str]
    study_date: Optional[date]
    study_time: Optional[str]
    referring_physician: Optional[str]
    status: str
    series_count: int
    instance_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StudyListResponse(BaseModel):
    """检查列表响应模型"""
    studies: List[StudyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class SeriesResponse(BaseModel):
    """序列响应模型"""
    id: int
    series_instance_uid: str
    series_number: Optional[int]
    study_id: int
    series_description: Optional[str]
    modality: Optional[str]
    body_part: Optional[str]
    instance_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class InstanceResponse(BaseModel):
    """实例响应模型"""
    id: int
    sop_instance_uid: str
    instance_number: Optional[int]
    series_id: int
    file_path: str
    file_size: Optional[int]
    rows: Optional[int]
    columns: Optional[int]
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

# API端点
@router.get("/studies", response_model=StudyListResponse, summary="获取检查列表")
async def get_studies(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    patient_id: Optional[int] = Query(None, description="患者ID筛选"),
    modality: Optional[str] = Query(None, description="影像模态筛选"),
    status: Optional[str] = Query(None, description="状态筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取检查列表

    支持分页、搜索和筛选功能
    """
    try:
        # 构建查询，关联患者表获取患者姓名
        query = db.query(Study, Patient.name.label('patient_name')).join(
            Patient, Study.patient_id == Patient.id
        ).filter(Patient.is_deleted == False)

        # 患者ID筛选
        if patient_id:
            query = query.filter(Study.patient_id == patient_id)

        # 影像模态筛选
        if modality:
            query = query.filter(Study.modality == modality)

        # 状态筛选
        if status:
            if status == "completed":
                query = query.filter(Study.status == StudyStatusEnum.COMPLETED)
            elif status == "in_progress":
                query = query.filter(Study.status == StudyStatusEnum.IN_PROGRESS)
            elif status == "scheduled":
                query = query.filter(Study.status == StudyStatusEnum.SCHEDULED)

        # 搜索筛选
        if search:
            search_filter = or_(
                Patient.name.contains(search),
                Patient.patient_id.contains(search),
                Study.study_description.contains(search),
                Study.study_id.contains(search)
            )
            query = query.filter(search_filter)

        # 获取总数
        total = query.count()

        # 分页
        offset = (page - 1) * page_size
        results = query.order_by(desc(Study.created_at)).offset(offset).limit(page_size).all()

        # 转换为响应格式
        study_responses = []
        for study, patient_name in results:
            response_data = {
                "id": study.id,
                "study_instance_uid": study.study_instance_uid,
                "study_id": study.study_id,
                "patient_id": study.patient_id,
                "patient_name": patient_name,
                "study_description": study.study_description,
                "modality": study.modality,
                "study_date": study.study_date,
                "study_time": str(study.study_time) if study.study_time else None,
                "referring_physician": study.referring_physician,
                "status": study.status.value if hasattr(study.status, 'value') else str(study.status),
                "series_count": study.series_count or 0,
                "instance_count": study.instance_count or 0,
                "created_at": study.created_at,
                "updated_at": study.updated_at
            }
            study_responses.append(StudyResponse(**response_data))

        total_pages = (total + page_size - 1) // page_size

        return StudyListResponse(
            studies=study_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"获取检查列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取检查列表过程中发生错误"
        )

@router.get("/studies/{study_id}", response_model=StudyResponse, summary="获取检查详情")
async def get_study(
    study_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定检查的详细信息
    """
    try:
        # 查询检查信息，关联患者表
        result = db.query(Study, Patient.name.label('patient_name')).join(
            Patient, Study.patient_id == Patient.id
        ).filter(
            and_(Study.id == study_id, Patient.is_deleted == False)
        ).first()

        if not result:
            raise ResourceNotFoundException(f"检查 ID {study_id} 不存在")

        study, patient_name = result

        # 转换为响应格式
        response_data = {
            "id": study.id,
            "study_instance_uid": study.study_instance_uid,
            "study_id": study.study_id,
            "patient_id": study.patient_id,
            "patient_name": patient_name,
            "study_description": study.study_description,
            "modality": study.modality,
            "study_date": study.study_date,
            "study_time": str(study.study_time) if study.study_time else None,
            "referring_physician": study.referring_physician,
            "status": study.status.value if hasattr(study.status, 'value') else str(study.status),
            "series_count": study.series_count or 0,
            "instance_count": study.instance_count or 0,
            "created_at": study.created_at,
            "updated_at": study.updated_at
        }

        return StudyResponse(**response_data)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"获取检查详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取检查详情过程中发生错误"
        )

@router.get("/studies/{study_id}/series", summary="获取检查的序列列表")
async def get_study_series(
    study_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定检查的序列列表
    """
    try:
        # 验证检查是否存在
        study = db.query(Study).filter(Study.id == study_id).first()
        if not study:
            raise ResourceNotFoundException(f"检查 ID {study_id} 不存在")

        # 查询序列列表
        series_list = db.query(Series).filter(Series.study_id == study_id).all()

        # 转换为响应格式
        series_responses = []
        for series in series_list:
            response_data = {
                "id": series.id,
                "series_instance_uid": series.series_instance_uid,
                "series_number": series.series_number,
                "study_id": series.study_id,
                "series_description": series.series_description,
                "modality": series.modality,
                "body_part": series.body_part,
                "instance_count": series.instance_count or 0,
                "status": series.status.value if hasattr(series.status, 'value') else str(series.status),
                "created_at": series.created_at
            }
            series_responses.append(SeriesResponse(**response_data))

        return {"series": series_responses, "total": len(series_responses)}

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"获取序列列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取序列列表过程中发生错误"
        )

@router.get("/series/{series_id}/instances", summary="获取序列的实例列表")
async def get_series_instances(
    series_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定序列的实例列表
    """
    try:
        # 验证序列是否存在
        series = db.query(Series).filter(Series.id == series_id).first()
        if not series:
            raise ResourceNotFoundException(f"序列 ID {series_id} 不存在")

        # 查询实例列表
        instances = db.query(Instance).filter(Instance.series_id == series_id).all()

        # 转换为响应格式
        instance_responses = []
        for instance in instances:
            response_data = {
                "id": instance.id,
                "sop_instance_uid": instance.sop_instance_uid,
                "instance_number": instance.instance_number,
                "series_id": instance.series_id,
                "file_path": instance.file_path,
                "file_size": instance.file_size,
                "rows": instance.rows,
                "columns": instance.columns,
                "status": instance.status.value if hasattr(instance.status, 'value') else str(instance.status),
                "created_at": instance.created_at
            }
            instance_responses.append(InstanceResponse(**response_data))

        return {"instances": instance_responses, "total": len(instance_responses)}

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"获取实例列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取实例列表过程中发生错误"
        )
