"""LabelMe-compatible documents built from persisted viewer annotations."""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Mapping, Sequence

LABELME_VERSION = "2025.7.4.0"
_SAME_POINT_EPSILON = 0.001
_CORNER_LABEL = re.compile(r"^([A-Z][A-Z]?\d+)-(1|2|3|4)$")


@dataclass(frozen=True, slots=True)
class _Point:
    x: float
    y: float


@dataclass(frozen=True, slots=True)
class _Annotation:
    label: str
    corners: tuple[_Point, ...]


def _number(value: object) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def _point(value: object) -> _Point | None:
    if not isinstance(value, Mapping):
        return None
    x = _number(value.get("x"))
    y = _number(value.get("y"))
    return _Point(x, y) if x is not None and y is not None else None


def _annotations(annotation: Mapping[str, object]) -> list[_Annotation]:
    raw_layer = annotation.get("vertebraeLayer")
    if not isinstance(raw_layer, Sequence) or isinstance(raw_layer, (str, bytes)):
        return []
    parsed: list[_Annotation] = []
    for raw_item in raw_layer:
        if not isinstance(raw_item, Mapping):
            continue
        label = raw_item.get("label")
        raw_corners = raw_item.get("corners")
        if not isinstance(label, str) or not isinstance(raw_corners, Sequence):
            continue
        corners = tuple(
            point
            for raw_corner in raw_corners
            if (point := _point(raw_corner)) is not None
        )
        if corners:
            parsed.append(_Annotation(label=label, corners=corners))
    return parsed


def _same_point(left: _Point, right: _Point) -> bool:
    return (
        abs(left.x - right.x) <= _SAME_POINT_EPSILON
        and abs(left.y - right.y) <= _SAME_POINT_EPSILON
    )


def _is_single_point(item: _Annotation) -> bool:
    return all(_same_point(item.corners[0], point) for point in item.corners[1:])


def _corner_ref(label: str) -> tuple[str, int] | None:
    match = _CORNER_LABEL.fullmatch(label)
    if match is None or match.group(1) == "S1":
        return None
    return match.group(1), int(match.group(2))


def _normalize_layer(items: list[_Annotation]) -> list[_Annotation]:
    """兼容历史单角点记录，并保持当前完整椎体记录为唯一事实源。"""

    complete_labels = {
        item.label
        for item in items
        if _corner_ref(item.label) is None and not _is_single_point(item)
    }
    groups: dict[str, dict[int, _Annotation]] = {}
    emitted: set[str] = set()
    for item in items:
        ref = _corner_ref(item.label)
        if ref is not None:
            groups.setdefault(ref[0], {})[ref[1]] = item

    normalized: list[_Annotation] = []
    for item in items:
        ref = _corner_ref(item.label)
        if ref is None:
            normalized.append(item)
            continue
        label, _corner_index = ref
        if label in complete_labels:
            continue
        group = groups.get(label, {})
        if not all(index in group for index in range(1, 5)):
            normalized.append(item)
            continue
        if label in emitted:
            continue
        emitted.add(label)
        normalized.append(
            _Annotation(
                label=label,
                corners=tuple(group[index].corners[0] for index in range(1, 5)),
            )
        )
    return normalized


def _positive_size(value: object, fallback: int) -> float:
    parsed = _number(value)
    return parsed if parsed is not None and parsed > 0 else float(fallback)


def _scale(
    point: _Point, source: tuple[float, float], target: tuple[int, int]
) -> list[float]:
    return [point.x * target[0] / source[0], point.y * target[1] / source[1]]


def _shape(label: str, shape_type: str, points: list[list[float]]) -> dict[str, object]:
    return {
        "label": label,
        "points": points,
        "group_id": None,
        "description": "",
        "shape_type": shape_type,
        "flags": {},
        "mask": None,
    }


def build_labelme_document(
    *,
    image_path: str,
    annotation: Mapping[str, object] | None,
    target_width: int,
    target_height: int,
) -> dict[str, object]:
    """Build the LabelMe payload without inventing unavailable contour masks."""

    snapshot = annotation or {}
    source = (
        _positive_size(snapshot.get("imageWidth"), target_width),
        _positive_size(snapshot.get("imageHeight"), target_height),
    )
    target = (target_width, target_height)
    shapes: list[dict[str, object]] = []
    s1_points: dict[int, list[float]] = {}
    has_cfh = False

    for item in _normalize_layer(_annotations(snapshot)):
        s1_match = re.fullmatch(r"S1-(1|2)", item.label)
        if s1_match is not None:
            s1_points[int(s1_match.group(1))] = _scale(item.corners[0], source, target)
            continue
        if item.label == "CFH":
            has_cfh = True
        if _is_single_point(item) or len(item.corners) < 4:
            shapes.append(
                _shape(item.label, "point", [_scale(item.corners[0], source, target)])
            )
            continue
        top_left, top_right, bottom_left, bottom_right = item.corners[:4]
        shapes.append(
            _shape(
                item.label,
                "polygon",
                [
                    _scale(top_left, source, target),
                    _scale(top_right, source, target),
                    _scale(bottom_right, source, target),
                    _scale(bottom_left, source, target),
                ],
            )
        )

    ordered_s1 = [s1_points[index] for index in (1, 2) if index in s1_points]
    if ordered_s1:
        shapes.append(
            _shape("S1", "line" if len(ordered_s1) == 2 else "point", ordered_s1)
        )

    raw_cfh = snapshot.get("cfhAnnotation")
    if not has_cfh and isinstance(raw_cfh, Mapping):
        center = _point(raw_cfh.get("center"))
        if center is not None:
            shapes.append(_shape("CFH", "point", [_scale(center, source, target)]))

    return {
        "version": LABELME_VERSION,
        "flags": {},
        "shapes": shapes,
        "imagePath": image_path,
        "imageData": None,
        "imageHeight": target_height,
        "imageWidth": target_width,
    }


def count_annotation_keypoints(annotation: Mapping[str, object] | None) -> int:
    """Count physical keypoints without double-counting repeated point storage."""

    items = _normalize_layer(_annotations(annotation or {}))
    count = sum(
        1 if _is_single_point(item) else min(len(item.corners), 4) for item in items
    )
    has_cfh = any(item.label == "CFH" for item in items)
    raw_cfh = (annotation or {}).get("cfhAnnotation")
    if not has_cfh and isinstance(raw_cfh, Mapping) and _point(raw_cfh.get("center")):
        count += 1
    return count
