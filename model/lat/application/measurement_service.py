from __future__ import annotations

from typing import Any

from lat.domain.measurement_pipeline import derive_measurements_from_detection
from lat.infrastructure.yolo_inference import get_inference_service


def load_measurement_models() -> None:
    get_inference_service()


def health_status() -> dict[str, str]:
    return {"status": "healthy"}


def measure_image(image, image_id: str = "lateral_spine") -> dict[str, Any]:
    height, width = image.shape[:2]
    detection_result = get_inference_service().detect(image)
    return derive_measurements_from_detection(
        detection_result.vertebrae,
        detection_result.cfh,
        image_width=width,
        image_height=height,
        image_id=image_id,
    )
