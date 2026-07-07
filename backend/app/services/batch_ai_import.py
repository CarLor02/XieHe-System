"""Batch image import AI processing helpers."""

from __future__ import annotations

import asyncio
import re
from datetime import datetime
from typing import Any, Iterable

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.core.database.session import SessionLocal
from app.core.system.logger import LogLevel, logger
from app.models.image import AnnotationTypeEnum, ImageAnnotation
from app.models.image_file import ImageFile, ImageFileStatusEnum
from app.api.v1.endpoints.imaging.handlers import files as file_handlers


_batch_ai_semaphore = asyncio.Semaphore(2)

TYPE_ALIASES = {
    "T1 Tilt": "t1-tilt",
    "T1 Slope": "t1-slope",
    "C2-C7 CL": "cl",
    "TK T2-T5": "tk-t2-t5",
    "TK T5-T12": "tk-t5-t12",
    "T10-L2": "t10-l2",
    "LL L1-S1": "ll-l1-s1",
    "LL L1-L4": "ll-l1-l4",
    "LL L4-S1": "ll-l4-s1",
    "SVA": "sva",
    "TPA": "tpa",
    "PI": "pi",
    "PT": "pt",
    "SS": "ss",
    "CA": "ca",
    "Pelvic": "pelvic",
    "Sacral": "sacral",
    "TS": "ts",
}


def _normalize_measurement_type(raw_type: str, cobb_index: int) -> tuple[str, str | None]:
    if raw_type.startswith("Cobb-"):
        return f"cobb{cobb_index}", raw_type
    if re.match(r"^Cobb\d+$", raw_type, re.IGNORECASE):
        return raw_type.lower(), raw_type
    if raw_type in TYPE_ALIASES:
        return TYPE_ALIASES[raw_type], raw_type
    return raw_type.strip().lower().replace(" ", "-"), raw_type


def _point_payload(point: Any) -> dict[str, float]:
    if isinstance(point, dict):
        return {"x": float(point["x"]), "y": float(point["y"])}
    return {"x": float(point.x), "y": float(point.y)}


def build_annotation_from_ai_response(
    *,
    image_file_id: int,
    patient_id: int | None,
    exam_type: str | None,
    ai_response: dict[str, Any],
) -> dict[str, Any]:
    """Build the image_files.annotation JSON consumed by the web viewer."""

    measurements: list[dict[str, Any]] = []
    cobb_index = 0

    for index, item in enumerate(ai_response.get("measurements") or [], start=1):
        if not isinstance(item, dict):
            continue
        raw_type = str(item.get("type") or "")
        if not raw_type:
            continue
        if raw_type.startswith("Cobb-"):
            cobb_index += 1
            type_id, original_type = _normalize_measurement_type(raw_type, cobb_index)
        else:
            type_id, original_type = _normalize_measurement_type(raw_type, 0)

        points = [_point_payload(point) for point in item.get("points") or []]
        measurements.append(
            {
                "id": f"ai-{image_file_id}-{index}",
                "type": type_id,
                "originalType": original_type,
                "value": str(item.get("value") or item.get("angle") or ""),
                "points": points,
                "description": "Cobb角测量" if type_id.startswith("cobb") else type_id,
                "upperVertebra": item.get("upper_vertebra"),
                "lowerVertebra": item.get("lower_vertebra"),
                "apexVertebra": item.get("apex_vertebra"),
            }
        )

    annotation: dict[str, Any] = {
        "imageId": str(image_file_id),
        "patientId": patient_id,
        "examType": exam_type,
        "measurements": measurements,
        "standardDistance": None,
        "standardDistancePoints": [],
        "pointBindings": {"syncGroups": []},
        "imageWidth": ai_response.get("imageWidth") or ai_response.get("image_width"),
        "imageHeight": ai_response.get("imageHeight") or ai_response.get("image_height"),
        "savedAt": datetime.now().isoformat(),
    }

    vertebrae = ai_response.get("vertebrae")
    if isinstance(vertebrae, list) and vertebrae:
        annotation["vertebraeLayer"] = vertebrae

    cfh = ai_response.get("cfh")
    if cfh is not None:
        annotation["cfhAnnotation"] = cfh

    return annotation


def batch_ai_status_for_image(image: Any) -> str:
    status = image.status
    if status == ImageFileStatusEnum.PROCESSING:
        return "running"
    if status == ImageFileStatusEnum.PROCESSED and image.annotation is not None:
        return "succeeded"
    if status == ImageFileStatusEnum.FAILED:
        return "failed"
    return "pending"


def _parse_measurement_value(value: str) -> tuple[float | None, str | None]:
    if not value:
        return None, None
    unit = "°" if "°" in value else "mm" if "mm" in value else None
    numeric = value.replace("°", "").replace("mm", "").strip()
    try:
        return float(numeric), unit
    except (TypeError, ValueError):
        return None, unit


def persist_ai_annotation(
    db: Session,
    image: ImageFile,
    *,
    ai_response: dict[str, Any],
    user_id: int | None,
) -> None:
    annotation = build_annotation_from_ai_response(
        image_file_id=image.id,
        patient_id=image.patient_id,
        exam_type=image.description,
        ai_response=ai_response,
    )
    image.annotation = annotation

    db.execute(delete(ImageAnnotation).where(ImageAnnotation.image_file_id == image.id))
    for measurement in annotation["measurements"]:
        value, unit = _parse_measurement_value(str(measurement.get("value") or ""))
        db.add(
            ImageAnnotation(
                image_file_id=image.id,
                annotation_type=AnnotationTypeEnum.MEASUREMENT,
                coordinates=[
                    [point["x"], point["y"]]
                    for point in measurement.get("points", [])
                ],
                label=measurement["type"],
                description=measurement.get("description") or measurement["type"],
                measurement_value=value,
                measurement_unit=unit,
                created_by=user_id,
            )
        )

    now = datetime.now()
    image.status = ImageFileStatusEnum.PROCESSED
    image.updated_at = now


async def process_image_ai(image_file_id: int, user_id: int | None) -> None:
    """Run AI for one imported image and persist viewer-ready annotation JSON."""

    async with _batch_ai_semaphore:
        db = SessionLocal()
        try:
            image = (
                db.query(ImageFile)
                .filter(ImageFile.id == image_file_id, ImageFile.is_deleted == False)
                .first()
            )
            if not image or image.status != ImageFileStatusEnum.UPLOADED:
                return

            image.status = ImageFileStatusEnum.PROCESSING
            image.updated_at = datetime.now()
            db.commit()
            db.refresh(image)

            ai_response = await file_handlers._post_ai_object_request(
                file_handlers._get_ai_object_url(image, "predict"),
                file_handlers._model_object_payload(image),
            )
            persist_ai_annotation(db, image, ai_response=ai_response, user_id=user_id)
            db.commit()
        except Exception as exc:  # noqa: BLE001 - background task must record per-image failure.
            db.rollback()
            failed = (
                db.query(ImageFile)
                .filter(ImageFile.id == image_file_id, ImageFile.is_deleted == False)
                .first()
            )
            if failed:
                failed.status = ImageFileStatusEnum.FAILED
                failed.updated_at = datetime.now()
                db.commit()
            logger.emit_event(
                LogLevel.ERROR,
                message=f"批量导入影像 {image_file_id} AI 处理失败: {exc}",
            )
        finally:
            db.close()


async def process_batch_ai(image_file_ids: Iterable[int], user_id: int | None) -> None:
    await asyncio.gather(
        *(process_image_ai(image_file_id, user_id) for image_file_id in image_file_ids)
    )
