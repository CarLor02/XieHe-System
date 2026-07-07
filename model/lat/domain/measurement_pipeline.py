from __future__ import annotations

import math
from enum import Enum
from pathlib import Path
from typing import Any, Iterable

from lat.domain.detection_models import CFHDetection, Point, VertebraDetection


PointDict = dict[str, float]
Measurement = dict[str, Any]


class LatMeasurementMetric(str, Enum):
    T1_SLOPE = "t1-slope"
    CL = "cl"
    TK_T2_T5 = "tk-t2-t5"
    TK_T5_T12 = "tk-t5-t12"
    T10_L2 = "t10-l2"
    LL_L1_S1 = "ll-l1-s1"
    LL_L1_L4 = "ll-l1-l4"
    LL_L4_S1 = "ll-l4-s1"
    SVA = "sva"
    TPA = "tpa"
    PI = "pi"
    PT = "pt"
    SS = "ss"


METRIC_DISPLAY_NAMES: dict[LatMeasurementMetric, str] = {
    LatMeasurementMetric.T1_SLOPE: "T1 Slope",
    LatMeasurementMetric.CL: "C2-C7 CL",
    LatMeasurementMetric.TK_T2_T5: "TK T2-T5",
    LatMeasurementMetric.TK_T5_T12: "TK T5-T12",
    LatMeasurementMetric.T10_L2: "T10-L2",
    LatMeasurementMetric.LL_L1_S1: "LL L1-S1",
    LatMeasurementMetric.LL_L1_L4: "LL L1-L4",
    LatMeasurementMetric.LL_L4_S1: "LL L4-S1",
    LatMeasurementMetric.SVA: "SVA",
    LatMeasurementMetric.TPA: "TPA",
    LatMeasurementMetric.PI: "PI",
    LatMeasurementMetric.PT: "PT",
    LatMeasurementMetric.SS: "SS",
}


def _pt(x: float, y: float) -> PointDict:
    return {"x": float(x), "y": float(y)}


def _to_pixel(point: Point, image_width: int, image_height: int) -> PointDict:
    return _pt(point.x * image_width, point.y * image_height)


def _line_angle(p1: PointDict, p2: PointDict) -> float:
    angle = math.degrees(math.atan2(p2["y"] - p1["y"], p2["x"] - p1["x"]))
    if angle > 90:
        angle -= 180
    elif angle < -90:
        angle += 180
    return angle


def _angle_between(v1: PointDict, v2: PointDict) -> float:
    dot = v1["x"] * v2["x"] + v1["y"] * v2["y"]
    mag1 = math.hypot(v1["x"], v1["y"])
    mag2 = math.hypot(v2["x"], v2["y"])
    if mag1 == 0 or mag2 == 0:
        return 0
    cos_value = max(-1, min(1, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_value))


def _to_acute(angle: float) -> float:
    return 180 - angle if angle > 90 else angle


def _actual_distance(pixel_distance: float) -> float:
    return (pixel_distance / 1000) * 300


def _pelvic_geometry(points: list[PointDict]) -> dict[str, Any] | None:
    if len(points) < 2:
        return None
    femoral = points[0] if len(points) >= 3 else None
    sacral_left = points[1] if len(points) >= 3 else points[0]
    sacral_right = points[2] if len(points) >= 3 else points[1]
    dx = sacral_right["x"] - sacral_left["x"]
    dy = sacral_right["y"] - sacral_left["y"]
    length = math.hypot(dx, dy)
    if length == 0:
        return None
    return {
        "femoral": femoral,
        "mid": _pt((sacral_left["x"] + sacral_right["x"]) / 2, (sacral_left["y"] + sacral_right["y"]) / 2),
        "normal": _pt(-dy / length, dx / length),
    }


def _cobb_value(points: list[PointDict]) -> str:
    angle1 = _line_angle(points[0], points[1])
    angle2 = _line_angle(points[2], points[3])
    diff = abs(angle2 - angle1) % 180
    angle = min(diff, 180 - diff)
    return f"{angle:.2f}°"


def _value(type_id: str, points: list[PointDict]) -> str:
    if type_id in {"t1-slope", "ss"} and len(points) >= 2:
        return f"{_line_angle(points[0], points[1]):.2f}°"
    if type_id in {
        "cl",
        "tk-t2-t5",
        "tk-t5-t12",
        "t10-l2",
        "ll-l1-s1",
        "ll-l1-l4",
        "ll-l4-s1",
    } and len(points) >= 4:
        return _cobb_value(points)
    if type_id == "sva" and len(points) >= 5:
        center_x = sum(point["x"] for point in points[:4]) / 4
        pixel_distance = points[4]["x"] - center_x
        actual = _actual_distance(abs(pixel_distance))
        signed = actual if pixel_distance > 0 else -actual
        return f"{signed:.2f}mm"
    if type_id == "pi" and len(points) >= 3:
        geometry = _pelvic_geometry(points)
        if not geometry or not geometry["femoral"]:
            return ""
        c_to_m = _pt(geometry["mid"]["x"] - geometry["femoral"]["x"], geometry["mid"]["y"] - geometry["femoral"]["y"])
        return f"{_to_acute(_angle_between(c_to_m, geometry['normal'])):.2f}°"
    if type_id == "pt" and len(points) >= 3:
        geometry = _pelvic_geometry(points)
        if not geometry or not geometry["femoral"]:
            return ""
        c_to_m = _pt(geometry["mid"]["x"] - geometry["femoral"]["x"], geometry["mid"]["y"] - geometry["femoral"]["y"])
        vertical = _pt(0, -1)
        return f"{_to_acute(_angle_between(c_to_m, vertical)):.2f}°"
    if type_id == "tpa" and len(points) >= 7:
        t1_center = _pt(
            (points[0]["x"] + points[1]["x"] + points[2]["x"] + points[3]["x"]) / 4,
            (points[0]["y"] + points[1]["y"] + points[2]["y"] + points[3]["y"]) / 4,
        )
        cfh = points[4]
        s1_center = _pt((points[5]["x"] + points[6]["x"]) / 2, (points[5]["y"] + points[6]["y"]) / 2)
        v1 = _pt(t1_center["x"] - cfh["x"], t1_center["y"] - cfh["y"])
        v2 = _pt(s1_center["x"] - cfh["x"], s1_center["y"] - cfh["y"])
        return f"{_to_acute(_angle_between(v1, v2)):.2f}°"
    return ""


def _sort_left_to_right(points: list[PointDict]) -> list[PointDict]:
    return sorted(points, key=lambda point: point["x"])


def _sort_corners(points: list[PointDict]) -> tuple[PointDict, PointDict, PointDict, PointDict]:
    by_y = sorted(points, key=lambda point: point["y"])
    top = sorted(by_y[:2], key=lambda point: point["x"])
    bottom = sorted(by_y[2:], key=lambda point: point["x"])
    return top[0], top[1], bottom[0], bottom[1]


def _normalize_metric(metric: LatMeasurementMetric | str) -> LatMeasurementMetric:
    if isinstance(metric, LatMeasurementMetric):
        return metric
    return LatMeasurementMetric(metric)


def _make_measurement(type_id: str, points: list[PointDict]) -> Measurement:
    return {
        "type": type_id,
        "value": _value(type_id, points),
        "points": points,
    }


def _filter_measurements(
    measurements: list[Measurement],
    metrics: Iterable[LatMeasurementMetric | str] | None,
) -> list[Measurement]:
    if metrics is None:
        return measurements
    requested = {_normalize_metric(metric).value for metric in metrics}
    return [measurement for measurement in measurements if measurement["type"] in requested]


def derive_measurements_from_detection(
    vertebrae: list[VertebraDetection],
    cfh: CFHDetection | None,
    image_id: str,
    image_width: int,
    image_height: int,
    metrics: Iterable[LatMeasurementMetric | str] | None = None,
) -> dict[str, Any]:
    endplates: dict[str, dict[str, Any]] = {}
    sacral: dict[str, PointDict] = {}
    vertebrae_layer: list[dict[str, Any]] = []

    best_by_label: dict[str, VertebraDetection] = {}
    for vertebra in vertebrae:
        current = best_by_label.get(vertebra.label)
        if current is None or vertebra.confidence > current.confidence:
            best_by_label[vertebra.label] = vertebra

    for label, vertebra in best_by_label.items():
        pixel_points = [_to_pixel(point, image_width, image_height) for point in vertebra.keypoints]
        if label == "S1" and len(pixel_points) >= 2:
            for index, point in enumerate(_sort_left_to_right(pixel_points[:2]), start=1):
                sacral[f"S1-{index}"] = point
                vertebrae_layer.append(
                    {
                        "label": f"S1-{index}",
                        "corners": [point, point, point, point],
                        "confidence": vertebra.confidence,
                        "source": "ai",
                    }
                )
            continue
        if len(pixel_points) != 4:
            continue
        tl, tr, bl, br = _sort_corners(pixel_points)
        endplates[label] = {
            "upper": [tl, tr],
            "lower": [bl, br],
            "center": _pt((tl["x"] + tr["x"] + bl["x"] + br["x"]) / 4, (tl["y"] + tr["y"] + bl["y"] + br["y"]) / 4),
        }
        vertebrae_layer.append(
            {
                "label": label,
                "corners": [tl, tr, bl, br],
                "confidence": vertebra.confidence,
                "source": "ai",
            }
        )

    cfh_payload = None
    cfh_point = None
    if cfh is not None:
        cfh_point = _to_pixel(cfh.center, image_width, image_height)
        cfh_payload = {
            "center": cfh_point,
            "confidence": cfh.confidence,
            "source": "ai",
        }
        vertebrae_layer.append(
            {
                "label": "CFH",
                "corners": [cfh_point, cfh_point, cfh_point, cfh_point],
                "confidence": cfh.confidence,
                "source": "ai",
            }
        )

    measurements: list[Measurement] = []
    has = lambda *labels: all(label in endplates for label in labels)
    s1_upper = [sacral["S1-1"], sacral["S1-2"]] if "S1-1" in sacral and "S1-2" in sacral else None
    s1_posterior = sacral.get("S1-2")

    if has("T1"):
        measurements.append(_make_measurement("t1-slope", endplates["T1"]["upper"]))
    if has("C2", "C7"):
        measurements.append(_make_measurement("cl", endplates["C2"]["lower"] + endplates["C7"]["lower"]))
    if has("T2", "T5"):
        measurements.append(_make_measurement("tk-t2-t5", endplates["T2"]["upper"] + endplates["T5"]["lower"]))
    if has("T5", "T12"):
        measurements.append(_make_measurement("tk-t5-t12", endplates["T5"]["upper"] + endplates["T12"]["lower"]))
    if has("T10", "L2"):
        measurements.append(_make_measurement("t10-l2", endplates["T10"]["upper"] + endplates["L2"]["lower"]))
    if has("L1") and s1_upper:
        measurements.append(_make_measurement("ll-l1-s1", endplates["L1"]["upper"] + s1_upper))
    if has("L1", "L4"):
        measurements.append(_make_measurement("ll-l1-l4", endplates["L1"]["upper"] + endplates["L4"]["lower"]))
    if has("L4") and s1_upper:
        measurements.append(_make_measurement("ll-l4-s1", endplates["L4"]["upper"] + s1_upper))
    if has("C7") and s1_posterior:
        measurements.append(_make_measurement("sva", endplates["C7"]["upper"] + endplates["C7"]["lower"] + [s1_posterior]))
    if has("T1") and s1_upper and cfh_point:
        measurements.append(_make_measurement("tpa", endplates["T1"]["upper"] + endplates["T1"]["lower"] + [cfh_point] + s1_upper))
    if s1_upper and cfh_point:
        measurements.append(_make_measurement("pi", [cfh_point] + s1_upper))
        measurements.append(_make_measurement("pt", [cfh_point] + s1_upper))
    if s1_upper:
        measurements.append(_make_measurement("ss", s1_upper))

    return {
        "imageId": image_id,
        "imageWidth": image_width,
        "imageHeight": image_height,
        "measurements": _filter_measurements(measurements, metrics),
        "vertebrae": vertebrae_layer,
        "cfh": cfh_payload,
        "raw_keypoints": {
            "vertebrae": [vertebra.model_dump() for vertebra in vertebrae],
            "cfh": cfh.model_dump() if cfh else None,
        },
    }


def build_measurement_excel_row(
    filename: str | Path,
    measurements: list[Measurement],
    metrics: Iterable[LatMeasurementMetric | str],
) -> dict[str, str]:
    by_type = {measurement["type"]: measurement for measurement in measurements}
    row: dict[str, str] = {"id": Path(filename).stem}
    for metric_value in metrics:
        metric = _normalize_metric(metric_value)
        row[METRIC_DISPLAY_NAMES[metric]] = str(by_type.get(metric.value, {}).get("value", ""))
    return row
