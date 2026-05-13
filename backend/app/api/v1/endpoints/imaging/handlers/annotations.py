"""
影像标注API端点

支持保存、加载、更新、删除影像标注和测量数据

@author XieHe Medical System
@created 2025-10-17
"""

from typing import Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database.session import get_async_db
from app.core.access.auth import get_current_active_user
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response, paginated_response
from app.models.image import ImageAnnotation
from app.models.image_file import ImageFile, ImageFileStatusEnum
from ..schemas.annotations import (
    Point,
    MeasurementData,
    SaveMeasurementsRequest,
    MeasurementsResponse,
)


router = APIRouter()




# API端点
@router.get("/{image_id}", response_model=Dict[str, Any], summary="获取影像的测量数据")
async def get_measurements(
    image_id: str,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
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
            result = await db.execute(select(ImageAnnotation).where(
                ImageAnnotation.image_file_id == image_file_id,
                ImageAnnotation.is_deleted == False
            ))
            annotations = result.scalars().all()

        else:
            # 可能是UUID
            image_result = await db.execute(select(ImageFile).where(
                ImageFile.file_uuid == image_id,
                ImageFile.is_deleted == False
            ))
            image_file = image_result.scalar_one_or_none()

            if image_file:
                annotation_result = await db.execute(select(ImageAnnotation).where(
                    ImageAnnotation.image_file_id == image_file.id,
                    ImageAnnotation.is_deleted == False
                ))
                annotations = annotation_result.scalars().all()

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
                logger.emit_event(LogLevel.WARNING, message=f"转换标注数据失败: {e}, 跳过此标注")
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
        logger.emit_event(LogLevel.ERROR, message=f"获取测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取测量数据失败"
        )


@router.post("/{image_id}", response_model=Dict[str, Any], summary="保存影像的测量数据")
async def save_measurements(
    image_id: str,
    request: SaveMeasurementsRequest,
    current_user: dict = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    保存影像的测量数据

    image_id 可以是：
    1. ImageFile 的数字 ID
    2. ImageFile 的 UUID
    """
    try:
        async with db.begin():
            # 解析 image_id 并锁定目标 ImageFile 行，串行化同一影像的保存请求。
            if image_id.isdigit():
                result = await db.execute(select(ImageFile).where(
                    ImageFile.id == int(image_id),
                    ImageFile.is_deleted == False
                ).with_for_update())
            else:
                result = await db.execute(select(ImageFile).where(
                    ImageFile.file_uuid == image_id,
                    ImageFile.is_deleted == False
                ).with_for_update())
            image_file = result.scalar_one_or_none()

            if not image_file:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="影像文件不存在"
                )
            image_file_id = image_file.id

            # 删除旧的标注数据
            await db.execute(delete(ImageAnnotation).where(
                ImageAnnotation.image_file_id == image_file_id
            ))

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
                    # 提取单位（mm 或 °），对多值格式（如 "12.3 × 8.5mm"）容错处理
                    if 'mm' in measurement.value:
                        measurement_unit = 'mm'
                        try:
                            measurement_value = float(measurement.value.replace('mm', '').strip())
                        except (ValueError, TypeError):
                            measurement_value = None
                    elif '°' in measurement.value:
                        measurement_unit = '°'
                        try:
                            measurement_value = float(measurement.value.replace('°', '').strip())
                        except (ValueError, TypeError):
                            measurement_value = None
                    else:
                        # 如果没有单位，尝试转换为float
                        try:
                            measurement_value = float(measurement.value)
                        except (ValueError, TypeError):
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

            now = datetime.now()
            image_file.status = ImageFileStatusEnum.PROCESSED
            image_file.uploaded_at = now
            image_file.updated_at = now

        logger.emit_event(LogLevel.INFO, message=f"影像文件 {image_file_id} 状态已更新为 PROCESSED")

        log_msg = f"保存测量数据成功: ImageFile ID {image_file_id}, 共 {len(request.measurements)} 条标注"
        logger.emit_event(LogLevel.INFO, message=log_msg)

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
        await db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"保存测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="保存测量数据失败"
        )
