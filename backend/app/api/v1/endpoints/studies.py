"""
影像检查API端点

实现影像检查的查询功能

@author XieHe Medical System
@created 2025-09-29
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from pydantic import BaseModel

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()

# Pydantic模型
class StudyResponse(BaseModel):
    """影像检查响应模型"""
    id: int
    study_instance_uid: str
    study_id: Optional[str]
    patient_id: int
    patient_name: str
    study_date: Optional[date]
    study_description: Optional[str]
    modality: str
    body_part: Optional[str]
    status: str
    series_count: int = 0
    instance_count: int = 0
    created_at: datetime

class StudyListResponse(BaseModel):
    """影像检查列表响应模型"""
    studies: List[StudyResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/", response_model=StudyListResponse, summary="获取影像检查列表")
async def get_studies(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    patient_id: Optional[int] = Query(None, description="患者ID筛选"),
    modality: Optional[str] = Query(None, description="检查类型筛选"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取影像检查列表
    
    支持分页和筛选功能
    """
    try:
        from app.models.image import Study
        from app.models.patient import Patient
        
        # 计算偏移量
        offset = (page - 1) * page_size
        
        # 构建查询
        query = db.query(Study, Patient.name).join(
            Patient, Study.patient_id == Patient.id
        ).filter(
            Patient.is_deleted == False
        )
        
        # 应用筛选条件
        if patient_id:
            query = query.filter(Study.patient_id == patient_id)
        
        if modality:
            query = query.filter(Study.modality == modality)
        
        # 排序
        query = query.order_by(desc(Study.created_at))
        
        # 获取总数
        total = query.count()
        total_pages = (total + page_size - 1) // page_size
        
        # 分页查询
        results = query.offset(offset).limit(page_size).all()
        
        # 构建响应数据
        studies = []
        for study, patient_name in results:
            studies.append(StudyResponse(
                id=study.id,
                study_instance_uid=study.study_instance_uid,
                study_id=study.study_id,
                patient_id=study.patient_id,
                patient_name=patient_name,
                study_date=study.study_date,
                study_description=study.study_description,
                modality=study.modality.value if study.modality else "XR",
                body_part=study.body_part.value if study.body_part else None,
                status=study.status.value if study.status else "COMPLETED",
                series_count=0,  # TODO: 从series表计算
                instance_count=0,  # TODO: 从instances表计算
                created_at=study.created_at
            ))
        
        return StudyListResponse(
            studies=studies,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"获取影像检查列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像检查列表失败"
        )

@router.get("/{study_id}", response_model=StudyResponse, summary="获取影像检查详情")
async def get_study(
    study_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取单个影像检查的详细信息
    """
    try:
        from app.models.image import Study
        from app.models.patient import Patient
        
        # 查询影像检查
        result = db.query(Study, Patient.name).join(
            Patient, Study.patient_id == Patient.id
        ).filter(
            Study.id == study_id,
            Patient.is_deleted == False
        ).first()
        
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像检查不存在"
            )
        
        study, patient_name = result
        
        return StudyResponse(
            id=study.id,
            study_instance_uid=study.study_instance_uid,
            study_id=study.study_id,
            patient_id=study.patient_id,
            patient_name=patient_name,
            study_date=study.study_date,
            study_description=study.study_description,
            modality=study.modality.value if study.modality else "XR",
            body_part=study.body_part.value if study.body_part else None,
            status=study.status.value if study.status else "COMPLETED",
            series_count=0,  # TODO: 从series表计算
            instance_count=0,  # TODO: 从instances表计算
            created_at=study.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取影像检查详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取影像检查详情失败"
        )
