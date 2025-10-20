"""
影像标注API端点

支持保存、加载、更新、删除影像标注和测量数据

@author XieHe Medical System
@created 2025-10-17
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.logging import get_logger
from app.models.image import ImageAnnotation, Study

logger = get_logger(__name__)

router = APIRouter()


# Pydantic模型
class Point(BaseModel):
    x: float
    y: float


class MeasurementData(BaseModel):
    id: str
    type: str
    value: str
    points: List[Point]
    description: Optional[str] = None


class SaveMeasurementsRequest(BaseModel):
    imageId: str
    patientId: int
    examType: str
    measurements: List[MeasurementData]
    reportText: Optional[str] = None
    savedAt: str


class MeasurementsResponse(BaseModel):
    measurements: List[MeasurementData]
    reportText: Optional[str] = None
    savedAt: Optional[str] = None


# API端点
@router.get("/{image_id}", response_model=MeasurementsResponse, summary="获取影像的测量数据")
async def get_measurements(
    image_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定影像的所有测量数据
    """
    try:
        # 从image_id提取study_id（例如IMG007 -> 7）
        study_id_str = image_id.replace('IMG', '')
        if not study_id_str.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的影像ID格式"
            )
        
        study_id = int(study_id_str)
        
        # 查询该study的所有标注
        annotations = db.query(ImageAnnotation).filter(
            ImageAnnotation.study_id == study_id,
            ImageAnnotation.is_deleted == False
        ).all()
        
        if not annotations:
            return MeasurementsResponse(measurements=[], reportText=None)
        
        # 转换为前端格式
        measurements = []
        for ann in annotations:
            try:
                # 处理coordinates，确保它是列表
                points = []
                if ann.coordinates:
                    if isinstance(ann.coordinates, list):
                        points = [Point(x=float(coord[0]), y=float(coord[1])) for coord in ann.coordinates]
                    elif isinstance(ann.coordinates, dict):
                        # 如果是dict，尝试转换
                        points = []

                measurement = MeasurementData(
                    id=str(ann.id),
                    type=ann.description if ann.description else (ann.annotation_type.value if hasattr(ann.annotation_type, 'value') else str(ann.annotation_type)),
                    value=str(ann.measurement_value) if ann.measurement_value else "",
                    points=points,
                    description=ann.description
                )
                measurements.append(measurement)
            except Exception as e:
                logger.warning(f"转换标注数据失败: {e}, 跳过此标注")
                continue
        
        return MeasurementsResponse(
            measurements=measurements,
            reportText=None,
            savedAt=annotations[0].created_at.isoformat() if annotations else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取测量数据失败"
        )


@router.post("/{image_id}", response_model=dict, summary="保存影像的测量数据")
async def save_measurements(
    image_id: str,
    request: SaveMeasurementsRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    保存影像的测量数据
    """
    try:
        # 从image_id提取study_id
        study_id_str = image_id.replace('IMG', '')
        if not study_id_str.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="无效的影像ID格式"
            )
        
        study_id = int(study_id_str)
        
        # 验证study是否存在
        study = db.query(Study).filter(Study.id == study_id).first()
        if not study:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="影像不存在"
            )
        
        # 删除旧的标注数据
        db.query(ImageAnnotation).filter(
            ImageAnnotation.study_id == study_id
        ).delete()
        
        # 保存新的标注数据
        from app.models.image import AnnotationTypeEnum

        for measurement in request.measurements:
            # 确定标注类型，映射前端类型到后端枚举
            type_mapping = {
                '长度测量': AnnotationTypeEnum.MEASUREMENT,
                '角度测量': AnnotationTypeEnum.MEASUREMENT,
                'Cobb角': AnnotationTypeEnum.MEASUREMENT,
                '距离测量': AnnotationTypeEnum.MEASUREMENT,
                '通用角度测量': AnnotationTypeEnum.MEASUREMENT,
            }
            annotation_type = type_mapping.get(measurement.type, AnnotationTypeEnum.MEASUREMENT)

            # 转换坐标格式
            coordinates = [[p.x, p.y] for p in measurement.points]

            annotation = ImageAnnotation(
                study_id=study_id,
                annotation_type=annotation_type,
                coordinates=coordinates,
                description=measurement.description or measurement.type,
                measurement_value=float(measurement.value.replace('mm', '').replace('°', '')) if measurement.value else None,
                created_by=current_user.get('id')
            )
            db.add(annotation)
        
        db.commit()
        
        logger.info(f"保存测量数据成功: Study ID {study_id}, 共 {len(request.measurements)} 条标注")
        
        return {
            "success": True,
            "message": "测量数据保存成功",
            "count": len(request.measurements)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"保存测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="保存测量数据失败"
        )

