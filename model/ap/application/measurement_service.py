from __future__ import annotations

from typing import Any

from ap.domain.measurement_pipeline import derive_measurements_from_keypoints
from ap.infrastructure.yolo_inference import (
    estimate_pose_from_vertebrae,
    infer_pose,
    infer_pose_corner,
    load_models,
    model_status,
)


def load_measurement_models() -> None:
    load_models()


def health_status() -> dict[str, Any]:
    return {"status": "ok", **model_status()}


def measure_image(image, image_id: str = "IMG001") -> dict[str, Any]:
    image_height, image_width = image.shape[:2]

    pose_data = infer_pose(image)
    vertebrae_data = infer_pose_corner(image)

    if not pose_data and vertebrae_data:
        print("[INFO] Pose detection failed, falling back to anatomical estimation from vertebrae.")
        pose_data = estimate_pose_from_vertebrae(vertebrae_data)

    return derive_measurements_from_keypoints(
        pose_data,
        vertebrae_data,
        image_id=image_id,
        image_width=image_width,
        image_height=image_height,
    )
