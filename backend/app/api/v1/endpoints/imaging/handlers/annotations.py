"""
影像标注API端点

支持保存、加载、更新、删除影像标注和测量数据

@author XieHe Medical System
@created 2025-10-17
"""

import typing
from datetime import datetime
from typing import Any, Dict, Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.access.auth import get_current_active_user
from app.core.database.session import get_async_db
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response
from app.models.image import AnnotationTypeEnum, ImageAnnotation
from app.models.image_file import ImageFile, ImageFileStatusEnum

from ..schemas.annotations import (
    MeasurementData,
    Point,
    SaveMeasurementsRequest,
)

router = APIRouter()


async def _load_annotations(
    db: AsyncSession, image_id: str
) -> Sequence[ImageAnnotation]:
    if image_id.isdigit():
        image_file_id = int(image_id)
    else:
        image_result = await db.execute(
            select(ImageFile).where(
                ImageFile.file_uuid == image_id,
                ImageFile.is_deleted.is_(False),
            )
        )
        image_file = image_result.scalar_one_or_none()
        if image_file is None:
            return []
        image_file_id = image_file.id

    result = await db.execute(
        select(ImageAnnotation).where(
            ImageAnnotation.image_file_id == image_file_id,
            ImageAnnotation.is_deleted.is_(False),
        )
    )
    return result.scalars().all()


def _annotation_to_measurement(annotation: ImageAnnotation) -> MeasurementData:
    points: list[Point] = []
    if isinstance(annotation.coordinates, list):
        points = [
            Point(x=float(coordinate[0]), y=float(coordinate[1]))
            for coordinate in annotation.coordinates
        ]

    value = ""
    if annotation.measurement_value is not None:
        value = str(annotation.measurement_value)
        if annotation.measurement_unit:
            value += annotation.measurement_unit

    return MeasurementData(
        id=str(annotation.id),
        type=annotation.label if annotation.label else annotation.description,
        value=value,
        points=points,
        description=annotation.description,
    )


async def _lock_image_file(db: AsyncSession, image_id: str) -> ImageFile:
    identity_filter = (
        ImageFile.id == int(image_id)
        if image_id.isdigit()
        else ImageFile.file_uuid == image_id
    )
    result = await db.execute(
        select(ImageFile)
        .where(identity_filter, ImageFile.is_deleted.is_(False))
        .with_for_update()
    )
    image_file = result.scalar_one_or_none()
    if image_file is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="影像文件不存在",
        )
    return image_file


def _measurement_value(value: str) -> tuple[float | None, str | None]:
    unit = "mm" if "mm" in value else "°" if "°" in value else None
    normalized = value.replace(unit, "").strip() if unit else value
    try:
        return float(normalized), unit
    except (TypeError, ValueError):
        return None, unit


def _build_annotation(
    image_file_id: int,
    measurement: MeasurementData,
    created_by: Any,
) -> ImageAnnotation:
    measurement_value, measurement_unit = _measurement_value(measurement.value)
    return ImageAnnotation(
        image_file_id=image_file_id,
        annotation_type=AnnotationTypeEnum.MEASUREMENT,
        coordinates=[[point.x, point.y] for point in measurement.points],
        label=measurement.type,
        description=measurement.description or measurement.type,
        measurement_value=measurement_value,
        measurement_unit=measurement_unit,
        created_by=created_by,
    )


# API端点
@router.get("/{image_id}", response_model=Dict[str, Any], summary="获取影像的测量数据")
async def get_measurements(
    image_id: str,
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, typing.Any]:
    """
    获取指定影像的所有测量数据

    支持两种模式：
    1. 新模式：image_id为ImageFile的ID或UUID
    2. 旧模式：image_id为IMG前缀的Study ID（如IMG007）
    """
    try:
        annotations = await _load_annotations(db, image_id)

        if not annotations:
            return success_response(
                data={"measurements": [], "reportText": None, "savedAt": None},
                message="未找到测量数据",
            )

        # 转换为前端格式
        measurements = []
        for ann in annotations:
            try:
                measurements.append(_annotation_to_measurement(ann))
            except Exception as e:
                logger.emit_event(
                    LogLevel.WARNING, message=f"转换标注数据失败: {e}, 跳过此标注"
                )
                continue

        return success_response(
            data={
                "measurements": [m.dict() for m in measurements],
                "reportText": None,
                "savedAt": (
                    annotations[0].created_at.isoformat()
                    if annotations and annotations[0].created_at is not None
                    else None
                ),
            },
            message="获取测量数据成功",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"获取测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="获取测量数据失败"
        )


@router.post("/{image_id}", response_model=Dict[str, Any], summary="保存影像的测量数据")
async def save_measurements(
    image_id: str,
    request: SaveMeasurementsRequest,
    current_user: dict[str, typing.Any] = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, typing.Any]:
    """
    保存影像的测量数据

    image_id 可以是：
    1. ImageFile 的数字 ID
    2. ImageFile 的 UUID
    """
    try:
        async with db.begin():
            image_file = await _lock_image_file(db, image_id)
            image_file_id = image_file.id

            # 删除旧的标注数据
            await db.execute(
                delete(ImageAnnotation).where(
                    ImageAnnotation.image_file_id == image_file_id
                )
            )

            for measurement in request.measurements:
                db.add(
                    _build_annotation(
                        image_file_id,
                        measurement,
                        current_user.get("id"),
                    )
                )

            now = datetime.now()
            image_file.status = ImageFileStatusEnum.PROCESSED
            image_file.uploaded_at = now
            image_file.updated_at = now

        logger.emit_event(
            LogLevel.INFO, message=f"影像文件 {image_file_id} 状态已更新为 PROCESSED"
        )

        log_msg = f"保存测量数据成功: ImageFile ID {image_file_id}, 共 {len(request.measurements)} 条标注"
        logger.emit_event(LogLevel.INFO, message=log_msg)

        return success_response(
            data={"count": len(request.measurements), "image_file_id": image_file_id},
            message="测量数据保存成功",
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.emit_event(LogLevel.ERROR, message=f"保存测量数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="保存测量数据失败"
        )
