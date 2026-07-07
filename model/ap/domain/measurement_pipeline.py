from __future__ import annotations

import math
from enum import Enum
from pathlib import Path
from typing import Any, Iterable

from ap.domain.cobb import (
    ORDER_INDEX,
    VERTEBRA_ORDER,
    all_candidates,
    as_corners,
    line_angle,
    select_nonoverlapping,
)


Point = dict[str, float]
Measurement = dict[str, Any]


class ApMeasurementMetric(str, Enum):
    COBB1 = "cobb1"
    COBB2 = "cobb2"
    COBB3 = "cobb3"
    T1_TILT = "t1-tilt"
    CA = "ca"
    PELVIC = "pelvic"
    SACRAL = "sacral"
    TS = "ts"


METRIC_DISPLAY_NAMES: dict[ApMeasurementMetric, str] = {
    ApMeasurementMetric.COBB1: "Cobb1",
    ApMeasurementMetric.COBB2: "Cobb2",
    ApMeasurementMetric.COBB3: "Cobb3",
    ApMeasurementMetric.T1_TILT: "T1 Tilt",
    ApMeasurementMetric.CA: "CA",
    ApMeasurementMetric.PELVIC: "Pelvic",
    ApMeasurementMetric.SACRAL: "Sacral",
    ApMeasurementMetric.TS: "TS",
}

POSE_LABEL_MAP = {
    "CR": "CL",
    "CL": "CR",
    "IR": "IL",
    "IL": "IR",
    "SR": "SL",
    "SL": "SR",
}


def _pt(x: float, y: float) -> Point:
    return {"x": float(x), "y": float(y)}


def _calculate_actual_distance(pixel_distance: float) -> float:
    return (pixel_distance / 1000) * 300


def _value(type_id: str, points: list[Point]) -> str:
    if type_id in {"t1-tilt", "ca", "pelvic", "sacral"} and len(points) >= 2:
        return f"{line_angle(points[0], points[1]):.2f}°"
    if type_id.lower().startswith("cobb") and len(points) >= 4:
        angle1 = math.atan2(points[1]["y"] - points[0]["y"], points[1]["x"] - points[0]["x"])
        angle2 = math.atan2(points[3]["y"] - points[2]["y"], points[3]["x"] - points[2]["x"])
        angle_diff = abs(angle2 - angle1) * (180 / math.pi)
        if angle_diff > 180:
            angle_diff = 360 - angle_diff
        left_y = abs(points[2]["y"] - points[0]["y"])
        right_y = abs(points[3]["y"] - points[1]["y"])
        signed = -angle_diff if left_y > right_y else angle_diff
        return f"{signed:.2f}°"
    if type_id == "ts" and len(points) >= 6:
        c7_center_x = sum(point["x"] for point in points[:4]) / 4
        sacral_mid_x = (points[4]["x"] + points[5]["x"]) / 2
        pixel_distance = sacral_mid_x - c7_center_x
        actual = _calculate_actual_distance(abs(pixel_distance))
        signed = actual if pixel_distance > 0 else -actual
        return f"{signed:.2f}mm"
    return ""


def _frontal_corners(vertebra: dict[str, Any]) -> dict[str, Point]:
    corners = vertebra["corners"]
    tl = corners.get("top_left") or corners.get("topLeft")
    tr = corners.get("top_right") or corners.get("topRight")
    bl = corners.get("bottom_left") or corners.get("bottomLeft")
    br = corners.get("bottom_right") or corners.get("bottomRight")
    top_left = _pt(tl["x"], tl["y"])
    top_right = _pt(tr["x"], tr["y"])
    bottom_left = _pt(bl["x"], bl["y"])
    bottom_right = _pt(br["x"], br["y"])
    return {
        "top_left": top_left,
        "top_right": top_right,
        "bottom_left": bottom_left,
        "bottom_right": bottom_right,
        "center": _pt(
            (top_left["x"] + top_right["x"] + bottom_left["x"] + bottom_right["x"]) / 4,
            (top_left["y"] + top_right["y"] + bottom_left["y"] + bottom_right["y"]) / 4,
        ),
    }


def find_cobb_angles_v2(vertebrae_data: dict[str, dict[str, Any]]) -> list[Measurement]:
    cobb_angles: list[Measurement] = []
    for row in select_nonoverlapping(all_candidates(vertebrae_data)):
        upper_name = row["upper_vertebra"]
        lower_name = row["lower_vertebra"]
        upper = as_corners(vertebrae_data[upper_name])
        lower = as_corners(vertebrae_data[lower_name])
        type_id = f"Cobb-Auto{row['auto_rank']}"
        points = [
            upper["top_left"],
            upper["top_right"],
            lower["bottom_left"],
            lower["bottom_right"],
        ]
        cobb_angles.append(
            _make_measurement(
                type_id,
                points,
                angle=row["signed_cobb_v2"],
                upper_vertebra=upper_name,
                lower_vertebra=lower_name,
                apex_vertebra=None,
            )
        )
    return cobb_angles


def _normalize_pose(pose_data: dict[str, dict[str, Any]]) -> dict[str, Point]:
    normalized: dict[str, Point] = {}
    for label, point in pose_data.items():
        mapped = POSE_LABEL_MAP.get(label, label)
        normalized[mapped] = _pt(point["x"], point["y"])
    return normalized


def _normalize_metric(metric: ApMeasurementMetric | str) -> ApMeasurementMetric:
    if isinstance(metric, ApMeasurementMetric):
        return metric
    return ApMeasurementMetric(metric)


def _measurement_type_for_metric(metric: ApMeasurementMetric) -> str:
    if metric == ApMeasurementMetric.COBB1:
        return "Cobb-Auto1"
    if metric == ApMeasurementMetric.COBB2:
        return "Cobb-Auto2"
    if metric == ApMeasurementMetric.COBB3:
        return "Cobb-Auto3"
    return metric.value


def _filter_measurements(
    measurements: list[Measurement],
    metrics: Iterable[ApMeasurementMetric | str] | None,
) -> list[Measurement]:
    if metrics is None:
        return measurements
    requested = {_measurement_type_for_metric(_normalize_metric(metric)) for metric in metrics}
    return [measurement for measurement in measurements if measurement["type"] in requested]


def _make_measurement(
    type_id: str,
    points: list[Point],
    **extra: Any,
) -> Measurement:
    measurement: Measurement = {
        "type": type_id,
        "value": _value(type_id, points),
        "points": points,
    }
    measurement.update(extra)
    return measurement


def derive_measurements_from_keypoints(
    pose_data: dict[str, dict[str, Any]],
    vertebrae_data: dict[str, dict[str, Any]],
    image_id: str,
    image_width: int,
    image_height: int,
    metrics: Iterable[ApMeasurementMetric | str] | None = None,
) -> dict[str, Any]:
    pose = _normalize_pose(pose_data)
    frontal = {
        name: _frontal_corners(vertebra)
        for name, vertebra in vertebrae_data.items()
        if name in ORDER_INDEX and "corners" in vertebra
    }
    measurements: list[Measurement] = []

    if "T1" in frontal:
        t1 = frontal["T1"]
        measurements.append(
            _make_measurement("t1-tilt", [t1["top_left"], t1["top_right"]])
        )

    measurements.extend(find_cobb_angles_v2(frontal))

    if "CR" in pose and "CL" in pose:
        measurements.append(_make_measurement("ca", [pose["CR"], pose["CL"]]))
    if "IR" in pose and "IL" in pose:
        measurements.append(_make_measurement("pelvic", [pose["IR"], pose["IL"]]))
    if "SR" in pose and "SL" in pose:
        measurements.append(_make_measurement("sacral", [pose["SR"], pose["SL"]]))
    if "C7" in frontal and "SR" in pose and "SL" in pose:
        c7 = frontal["C7"]
        measurements.append(
            _make_measurement(
                "ts",
                [
                    c7["top_left"],
                    c7["top_right"],
                    c7["bottom_left"],
                    c7["bottom_right"],
                    pose["SR"],
                    pose["SL"],
                ],
            )
        )

    vertebrae = [
        {
            "label": label,
            "corners": [
                corners["top_left"],
                corners["top_right"],
                corners["bottom_left"],
                corners["bottom_right"],
            ],
            "confidence": float(vertebrae_data.get(label, {}).get("confidence", 1)),
            "source": "ai",
        }
        for label, corners in frontal.items()
    ]
    vertebrae.extend(
        {
            "label": label,
            "corners": [point, point, point, point],
            "confidence": float(pose_data.get(raw_label, {}).get("confidence", 1)),
            "source": "ai",
        }
        for raw_label, point_data in pose_data.items()
        for label, point in [(POSE_LABEL_MAP.get(raw_label, raw_label), _pt(point_data["x"], point_data["y"]))]
    )

    return {
        "imageId": image_id,
        "imageWidth": image_width,
        "imageHeight": image_height,
        "measurements": _filter_measurements(measurements, metrics),
        "vertebrae": vertebrae,
        "cfh": None,
        "raw_keypoints": {
            "pose_keypoints": pose_data,
            "vertebrae": vertebrae_data,
        },
    }


def build_measurement_excel_row(
    filename: str | Path,
    measurements: list[Measurement],
    metrics: Iterable[ApMeasurementMetric | str],
) -> dict[str, str]:
    by_type = {measurement["type"]: measurement for measurement in measurements}
    row: dict[str, str] = {"id": Path(filename).stem}
    for metric_value in metrics:
        metric = _normalize_metric(metric_value)
        type_id = _measurement_type_for_metric(metric)
        row[METRIC_DISPLAY_NAMES[metric]] = str(by_type.get(type_id, {}).get("value", ""))
    return row
