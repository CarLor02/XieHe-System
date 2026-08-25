from __future__ import annotations

from typing import Any

import numpy as np
from ultralytics import YOLO

from ap.config import (
    CONF_THRESHOLD,
    MODEL_CANDIDATE_CONF_THRESHOLD,
    POSE_CORNER_IMGSZ,
    POSE_CORNER_MODEL_PATH,
    POSE_CORNER_STANDARD_CLASS_COUNT,
    POSE_IMGSZ,
    POSE_MODEL_PATH,
)


pose_model = None
pose_corner_model = None


def load_models() -> None:
    global pose_model, pose_corner_model

    if pose_model is None and POSE_MODEL_PATH.exists():
        print(f"Loading Pose model: {POSE_MODEL_PATH}")
        pose_model = YOLO(str(POSE_MODEL_PATH))

    if pose_corner_model is None and POSE_CORNER_MODEL_PATH.exists():
        print(f"Loading Pose Corner model: {POSE_CORNER_MODEL_PATH}")
        pose_corner_model = YOLO(str(POSE_CORNER_MODEL_PATH))


def model_status() -> dict[str, bool]:
    return {
        "pose_model": pose_model is not None,
        "pose_corner_model": pose_corner_model is not None,
    }


def infer_pose(img: np.ndarray) -> dict[str, dict[str, float]]:
    if pose_model is None:
        return {}

    orig_h, orig_w = img.shape[:2]
    result = pose_model.predict(
        img,
        imgsz=POSE_IMGSZ,
        conf=MODEL_CANDIDATE_CONF_THRESHOLD,
        verbose=False,
    )[0]
    keypoint_names = ["CR", "CL", "IR", "IL", "SR", "SL"]
    pose_data: dict[str, dict[str, float]] = {}

    if result.keypoints is None or len(result.keypoints) == 0:
        return pose_data

    keypoints = result.keypoints.xy.cpu().numpy()
    confidences = result.keypoints.conf.cpu().numpy() if result.keypoints.conf is not None else None
    box_confs = result.boxes.conf.cpu().numpy()
    keypoints_xyn = (
        result.keypoints.xyn.cpu().numpy()
        if hasattr(result.keypoints, "xyn") and result.keypoints.xyn is not None
        else None
    )

    best_idx = 0
    best_conf = 0.0
    for obj_idx in range(len(keypoints)):
        if box_confs[obj_idx] > best_conf and box_confs[obj_idx] >= CONF_THRESHOLD:
            best_conf = box_confs[obj_idx]
            best_idx = obj_idx

    if best_conf < CONF_THRESHOLD or keypoints_xyn is None:
        return pose_data

    for kpt_idx in range(min(6, len(keypoints[best_idx]))):
        x_norm, y_norm = keypoints_xyn[best_idx][kpt_idx]
        conf = confidences[best_idx][kpt_idx] if confidences is not None else 1.0
        pose_data[keypoint_names[kpt_idx]] = {
            "x": float(x_norm * orig_w),
            "y": float(y_norm * orig_h),
            "confidence": float(conf),
        }

    if len(pose_data) == 6:
        xs = [point["x"] for point in pose_data.values()]
        ys = [point["y"] for point in pose_data.values()]
        spread_x = max(xs) - min(xs)
        spread_y = max(ys) - min(ys)
        if spread_x < orig_w * 0.10 or spread_y < orig_h * 0.20:
            print(
                "[WARN] Pose keypoints collapsed "
                f"(spread_x={spread_x:.1f}/{orig_w * 0.10:.1f}, "
                f"spread_y={spread_y:.1f}/{orig_h * 0.20:.1f}), discarding."
            )
            return {}

    return pose_data


def estimate_pose_from_vertebrae(vertebrae_data: dict[str, dict[str, Any]]) -> dict[str, dict[str, float]]:
    pose_data: dict[str, dict[str, float]] = {}

    def estimated_point(x: float, y: float) -> dict[str, float]:
        return {"x": float(x), "y": float(y), "confidence": 0.0}

    if "L5" in vertebrae_data:
        l5c = vertebrae_data["L5"]["corners"]
        l5_height = l5c["bottom_mid"]["y"] - l5c["top_mid"]["y"]
        s1_y = l5c["bottom_mid"]["y"] + l5_height * 0.5
        pose_data["SR"] = estimated_point(l5c["bottom_right"]["x"], s1_y)
        pose_data["SL"] = estimated_point(l5c["bottom_left"]["x"], s1_y)

    ref_iliac = vertebrae_data.get("L3") or vertebrae_data.get("L4")
    if ref_iliac:
        corners = ref_iliac["corners"]
        v_width = corners["top_right"]["x"] - corners["top_left"]["x"]
        cx, cy = corners["center"]["x"], corners["center"]["y"]
        pose_data["IR"] = estimated_point(cx + v_width * 2.5, cy)
        pose_data["IL"] = estimated_point(cx - v_width * 2.5, cy)

    ref_shoulder = vertebrae_data.get("T1") or vertebrae_data.get("T2") or vertebrae_data.get("C7")
    if ref_shoulder:
        corners = ref_shoulder["corners"]
        v_width = corners["top_right"]["x"] - corners["top_left"]["x"]
        cx, cy = corners["center"]["x"], corners["center"]["y"]
        pose_data["CR"] = estimated_point(cx + v_width * 4.5, cy)
        pose_data["CL"] = estimated_point(cx - v_width * 4.5, cy)

    return pose_data


def _select_native_class_indices(
    class_ids: np.ndarray,
    confidences: np.ndarray,
    confidence_threshold: float,
    standard_class_count: int = POSE_CORNER_STANDARD_CLASS_COUNT,
) -> list[tuple[int, int]]:
    """Return the highest-confidence prediction index for each supported model class."""
    selected: dict[int, tuple[float, int]] = {}
    for index, (raw_class_id, raw_confidence) in enumerate(zip(class_ids, confidences)):
        class_id = int(raw_class_id)
        confidence = float(raw_confidence)
        if not 0 <= class_id < standard_class_count or confidence < confidence_threshold:
            continue
        current = selected.get(class_id)
        if current is None or confidence > current[0]:
            selected[class_id] = (confidence, index)
    return [(class_id, selected[class_id][1]) for class_id in sorted(selected)]


def class_id_to_vertebra_name(class_id: int) -> str:
    if class_id == 0:
        return "C7"
    if 1 <= class_id <= 12:
        return f"T{class_id}"
    if 13 <= class_id < POSE_CORNER_STANDARD_CLASS_COUNT:
        return f"L{class_id - 12}"
    raise ValueError(f"Unsupported standard vertebra class: {class_id}")


def infer_pose_corner(img: np.ndarray) -> dict[str, dict[str, Any]]:
    if pose_corner_model is None:
        return {}

    result = pose_corner_model.predict(
        img,
        imgsz=POSE_CORNER_IMGSZ,
        conf=MODEL_CANDIDATE_CONF_THRESHOLD,
        verbose=False,
    )[0]
    corner_keys = ["top_left", "top_right", "bottom_right", "bottom_left"]
    vertebrae: dict[str, dict[str, Any]] = {}

    if result.keypoints is None or len(result.keypoints) == 0:
        return vertebrae

    keypoints = result.keypoints.data.cpu().numpy()
    boxes = result.boxes
    class_ids = boxes.cls.cpu().numpy()
    box_confidences = boxes.conf.cpu().numpy()
    assignments = _select_native_class_indices(class_ids, box_confidences, CONF_THRESHOLD)

    for class_id, index in assignments:
        kpts = keypoints[index]
        confidence = float(box_confidences[index])
        vertebra_name = class_id_to_vertebra_name(class_id)

        corners = {}
        for keypoint_index, (x, y, visibility) in enumerate(kpts):
            corners[corner_keys[keypoint_index]] = {
                "x": float(x),
                "y": float(y),
                "conf": float(visibility),
            }

        tl, tr = corners["top_left"], corners["top_right"]
        bl, br = corners["bottom_left"], corners["bottom_right"]
        corners["top_mid"] = {"x": (tl["x"] + tr["x"]) / 2, "y": (tl["y"] + tr["y"]) / 2}
        corners["bottom_mid"] = {"x": (bl["x"] + br["x"]) / 2, "y": (bl["y"] + br["y"]) / 2}
        corners["center"] = {
            "x": (tl["x"] + tr["x"] + bl["x"] + br["x"]) / 4,
            "y": (tl["y"] + tr["y"] + bl["y"] + br["y"]) / 4,
        }

        vertebrae[vertebra_name] = {
            "corners": corners,
            "confidence": confidence,
            "class_id": class_id,
        }

    return vertebrae
