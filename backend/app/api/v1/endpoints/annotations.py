"""
影像标注API端点

支持保存、加载、更新、删除影像标注和测量数据

@author XieHe Medical System
@created 2025-10-17
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.logging import get_logger
from app.core.response import success_response, paginated_response
from app.models.image import ImageAnnotation
from app.models.image_file import ImageFile

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
@router.get("/{image_id}", response_model=Dict[str, Any], summary="获取影像的测量数据")
async def get_measurements(
    image_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定影像的所有测量数据

    支持两种模式：
    1. 新模式：image_id为ImageFile的ID或UUID
    2. 旧模式：image_id为IMG前缀的Study ID（如IMG007）
    """
    try:
        annotations = []

        # 尝试新模式：直接使用image_file_id
        if image_id.isdigit():
            # 纯数字，可能是ImageFile的ID
            image_file_id = int(image_id)
            annotations = db.query(ImageAnnotation).filter(
                ImageAnnotation.image_file_id == image_file_id,
                ImageAnnotation.is_deleted == False
            ).all()

        else:
            # 可能是UUID
            image_file = db.query(ImageFile).filter(
                ImageFile.file_uuid == image_id,
                ImageFile.is_deleted == False
            ).first()

            if image_file:
                annotations = db.query(ImageAnnotation).filter(
                    ImageAnnotation.image_file_id == image_file.id,
                    ImageAnnotation.is_deleted == False
                ).all()

        if not annotations:
            return success_response(
                data={
                    "measurements": [],
                    "reportText": None,
                    "savedAt": None
                },
                message="未找到测量数据"
            )

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

                # 构建带单位的测量值
                value_str = ""
                if ann.measurement_value is not None:
                    value_str = str(ann.measurement_value)
                    if ann.measurement_unit:
                        value_str += ann.measurement_unit

                measurement = MeasurementData(
                    id=str(ann.id),
                    type=ann.label if ann.label else ann.description,
                    value=value_str,
                    points=points,
                    description=ann.description
                )
                measurements.append(measurement)
            except Exception as e:
                logger.warning(f"转换标注数据失败: {e}, 跳过此标注")
                continue

        return success_response(
            data={
                "measurements": [m.dict() for m in measurements],
                "reportText": None,
                "savedAt": annotations[0].created_at.isoformat() if annotations else None
            },
            message="获取测量数据成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取测量数据失败"
        )


@router.post("/{image_id}", response_model=Dict[str, Any], summary="保存影像的测量数据")
async def save_measurements(
    image_id: str,
    request: SaveMeasurementsRequest,
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    保存影像的测量数据

    image_id 可以是：
    1. ImageFile 的数字 ID
    2. ImageFile 的 UUID
    """
    try:
        image_file_id = None

        # 解析image_id
        if image_id.isdigit():
            # 纯数字，ImageFile的ID
            image_file_id = int(image_id)
            image_file = db.query(ImageFile).filter(ImageFile.id == image_file_id).first()
            if not image_file:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="影像文件不存在"
                )
        else:
            # UUID格式
            image_file = db.query(ImageFile).filter(
                ImageFile.file_uuid == image_id,
                ImageFile.is_deleted == False
            ).first()

            if not image_file:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="影像文件不存在"
                )
            image_file_id = image_file.id

        # 删除旧的标注数据
        db.query(ImageAnnotation).filter(
            ImageAnnotation.image_file_id == image_file_id
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

            # 提取测量值和单位
            measurement_value = None
            measurement_unit = None
            if measurement.value:
                # 提取单位（mm 或 °）
                if 'mm' in measurement.value:
                    measurement_unit = 'mm'
                    measurement_value = float(measurement.value.replace('mm', '').strip())
                elif '°' in measurement.value:
                    measurement_unit = '°'
                    measurement_value = float(measurement.value.replace('°', '').strip())
                else:
                    # 如果没有单位，尝试转换为float
                    try:
                        measurement_value = float(measurement.value)
                    except:
                        measurement_value = None

            annotation = ImageAnnotation(
                image_file_id=image_file_id,
                annotation_type=annotation_type,
                coordinates=coordinates,
                label=measurement.type,
                description=measurement.description or measurement.type,
                measurement_value=measurement_value,
                measurement_unit=measurement_unit,
                created_by=current_user.get('id')
            )
            db.add(annotation)

        db.commit()

        # 更新图像状态为 PROCESSED（已处理）- 使用原生SQL避免外键检查问题
        if image_file_id:
            try:
                db.execute(
                    text("""
                        UPDATE image_files
                        SET status = 'PROCESSED',
                            uploaded_at = :now,
                            updated_at = :now
                        WHERE id = :image_file_id
                    """),
                    {"now": datetime.now(), "image_file_id": image_file_id}
                )
                db.commit()
                logger.info(f"影像文件 {image_file_id} 状态已更新为 PROCESSED")
            except Exception as e:
                logger.warning(f"更新影像文件状态失败: {e}")
                # 不影响主流程，继续执行

        log_msg = f"保存测量数据成功: ImageFile ID {image_file_id}, 共 {len(request.measurements)} 条标注"
        logger.info(log_msg)

        return success_response(
            data={
                "count": len(request.measurements),
                "image_file_id": image_file_id
            },
            message="测量数据保存成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"保存测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="保存测量数据失败"
        )

