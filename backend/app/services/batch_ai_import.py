"""Batch image import AI processing helpers."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from sqlalchemy.orm import Session

from app.contexts.imaging.application import (
    AnnotationApplicationService,
    ImageVisibilityApplicationService,
)
from app.contexts.imaging.domain import AnnotationMutationReason, AnnotationSource
from app.contexts.imaging.infrastructure import (
    SqlAlchemyAnnotationRepository,
    SqlAlchemyImageVisibilityRepository,
)
from app.models.image_file import ImageFile

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


def _normalize_measurement_type(
    raw_type: str, cobb_index: int
) -> tuple[str, str | None]:
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
        "imageHeight": ai_response.get("imageHeight")
        or ai_response.get("image_height"),
        "savedAt": datetime.now().isoformat(),
    }

    vertebrae = ai_response.get("vertebrae")
    if isinstance(vertebrae, list) and vertebrae:
        annotation["vertebraeLayer"] = vertebrae

    cfh = ai_response.get("cfh")
    if cfh is not None:
        annotation["cfhAnnotation"] = cfh

    return annotation


def persist_ai_annotation(
    db: Session,
    image: ImageFile,
    *,
    ai_response: dict[str, Any],
    user_id: int | None,
) -> None:
    repository = SqlAlchemyAnnotationRepository(db)
    locked_image = repository.get_for_update(image.id)
    if locked_image is None:
        raise ValueError(f"影像文件不存在: {image.id}")
    annotation = build_annotation_from_ai_response(
        image_file_id=locked_image.id,
        patient_id=locked_image.patient_id,
        exam_type=locked_image.description,
        ai_response=ai_response,
    )
    AnnotationApplicationService(
        repository,
        ImageVisibilityApplicationService(SqlAlchemyImageVisibilityRepository(db)),
    ).save_locked_image(
        image=locked_image,
        actor_id=user_id,
        annotation=annotation,
        source=AnnotationSource.AI,
        reason=AnnotationMutationReason.AI_IMPORT,
    )
