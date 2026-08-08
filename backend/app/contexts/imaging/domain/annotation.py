"""标注快照、可见标注项身份及差异计算。"""

from __future__ import annotations

import copy
import enum
import hashlib
import re
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Mapping

ANNOTATION_SCHEMA_VERSION = 1
_VERTEBRA_LABEL = re.compile(r"^(?:C|T|L)\d+$")
_NUMBERED_KEYPOINT_LABEL = re.compile(r"^.+-\d+$")
_AUDIT_ITEM_ID_MAX_LENGTH = 128


class AnnotationSource(str, enum.Enum):
    MANUAL = "MANUAL"
    AI = "AI"
    SYSTEM = "SYSTEM"
    MIGRATION = "MIGRATION"


class AnnotationMutationReason(str, enum.Enum):
    SAVE = "SAVE"
    CLEAR_ALL = "CLEAR_ALL"
    AI_IMPORT = "AI_IMPORT"
    CONTENT_REPLACEMENT = "CONTENT_REPLACEMENT"
    EXAM_TYPE_CHANGE = "EXAM_TYPE_CHANGE"
    BASELINE = "BASELINE"


class AnnotationItemKind(str, enum.Enum):
    MEASUREMENT = "MEASUREMENT"
    KEYPOINT = "KEYPOINT"
    CALIBRATION = "CALIBRATION"


@dataclass(frozen=True)
class AnnotationItem:
    kind: AnnotationItemKind
    item_id: str
    payload: dict[str, Any]


@dataclass(frozen=True)
class AnnotationItemChange:
    kind: AnnotationItemKind
    item_id: str
    action: str
    before: dict[str, Any] | None
    after: dict[str, Any] | None


def normalize_audit_item_id(value: object) -> str:
    """Keep audit identities within the database key while preserving stability."""

    item_id = str(value)
    if len(item_id) <= _AUDIT_ITEM_ID_MAX_LENGTH:
        return item_id
    digest = hashlib.sha256(item_id.encode("utf-8")).hexdigest()
    return f"sha256:{digest}"


def canonicalize_annotation(
    annotation: Mapping[str, Any] | None,
    *,
    saved_at: datetime,
) -> dict[str, Any]:
    """保留未知扩展字段，同时由服务端统一 schema 版本和保存时间。"""

    snapshot = copy.deepcopy(dict(annotation or {}))
    snapshot["schemaVersion"] = ANNOTATION_SCHEMA_VERSION
    snapshot["savedAt"] = saved_at.isoformat()
    snapshot.setdefault("measurements", [])
    snapshot.setdefault("pointBindings", {"syncGroups": []})
    snapshot.setdefault("vertebraeLayer", [])
    return snapshot


def _comparison_snapshot(annotation: Mapping[str, Any] | None) -> dict[str, Any]:
    snapshot = copy.deepcopy(dict(annotation or {}))
    snapshot.pop("savedAt", None)
    snapshot.pop("schemaVersion", None)
    snapshot.setdefault("measurements", [])
    snapshot.setdefault("pointBindings", {"syncGroups": []})
    snapshot.setdefault("vertebraeLayer", [])
    return snapshot


def snapshots_equal(
    previous: Mapping[str, Any] | None,
    current: Mapping[str, Any] | None,
) -> bool:
    return _comparison_snapshot(previous) == _comparison_snapshot(current)


def has_annotation_content(annotation: Mapping[str, Any] | None) -> bool:
    """只以用户可见内容判断是否为已处理标注。"""

    if not annotation:
        return False
    if annotation.get("measurements"):
        return True
    if annotation.get("vertebraeLayer"):
        return True
    if annotation.get("cfhAnnotation"):
        return True
    points = annotation.get("standardDistancePoints")
    return annotation.get("standardDistance") is not None and bool(points)


def _measurement_items(annotation: Mapping[str, Any]) -> list[AnnotationItem]:
    measurements = annotation.get("measurements")
    if not isinstance(measurements, list):
        return []

    items: list[AnnotationItem] = []
    for index, measurement in enumerate(measurements):
        if not isinstance(measurement, dict):
            continue
        raw_id = measurement.get("id")
        item_id = normalize_audit_item_id(
            raw_id if raw_id not in (None, "") else f"legacy-{index}"
        )
        items.append(
            AnnotationItem(
                kind=AnnotationItemKind.MEASUREMENT,
                item_id=item_id,
                payload=copy.deepcopy(measurement),
            )
        )
    return items


def _point_payload(annotation: Mapping[str, Any], point: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"point": copy.deepcopy(point)}
    for field in ("source", "confidence"):
        if field in annotation:
            payload[field] = copy.deepcopy(annotation[field])
    return payload


def _keypoint_items(annotation: Mapping[str, Any]) -> list[AnnotationItem]:
    layer = annotation.get("vertebraeLayer")
    if not isinstance(layer, list):
        layer = []

    by_id: dict[str, AnnotationItem] = {}
    for entry in layer:
        if not isinstance(entry, dict):
            continue
        label = entry.get("label")
        corners = entry.get("corners")
        if not isinstance(label, str) or not isinstance(corners, list) or not corners:
            continue

        if _NUMBERED_KEYPOINT_LABEL.match(label) or not (
            _VERTEBRA_LABEL.match(label) or label == "S1"
        ):
            item_id = normalize_audit_item_id(label)
            by_id[item_id] = AnnotationItem(
                AnnotationItemKind.KEYPOINT,
                item_id,
                _point_payload(entry, corners[0]),
            )
            continue

        point_count = min(len(corners), 2 if label == "S1" else 4)
        for index in range(point_count):
            item_id = f"{label}-{index + 1}"
            by_id[item_id] = AnnotationItem(
                AnnotationItemKind.KEYPOINT,
                item_id,
                _point_payload(entry, corners[index]),
            )

    cfh = annotation.get("cfhAnnotation")
    if isinstance(cfh, dict) and "center" in cfh:
        by_id["CFH"] = AnnotationItem(
            AnnotationItemKind.KEYPOINT,
            "CFH",
            _point_payload(cfh, cfh["center"]),
        )
    return list(by_id.values())


def _calibration_items(annotation: Mapping[str, Any]) -> list[AnnotationItem]:
    points = annotation.get("standardDistancePoints")
    distance = annotation.get("standardDistance")
    if distance is None or not isinstance(points, list) or not points:
        return []
    return [
        AnnotationItem(
            AnnotationItemKind.CALIBRATION,
            "standard-distance",
            {
                "distance": copy.deepcopy(distance),
                "points": copy.deepcopy(points),
            },
        )
    ]


def extract_annotation_items(
    annotation: Mapping[str, Any] | None,
) -> dict[tuple[AnnotationItemKind, str], AnnotationItem]:
    if not annotation:
        return {}
    items = [
        *_measurement_items(annotation),
        *_keypoint_items(annotation),
        *_calibration_items(annotation),
    ]
    return {(item.kind, item.item_id): item for item in items}


def diff_annotation_items(
    previous: Mapping[str, Any] | None,
    current: Mapping[str, Any] | None,
) -> list[AnnotationItemChange]:
    before_items = extract_annotation_items(previous)
    after_items = extract_annotation_items(current)
    keys = sorted(
        before_items.keys() | after_items.keys(),
        key=lambda item: (item[0].value, item[1]),
    )

    changes: list[AnnotationItemChange] = []
    for key in keys:
        before = before_items.get(key)
        after = after_items.get(key)
        if before is None and after is not None:
            action = "CREATED"
        elif before is not None and after is None:
            action = "DELETED"
        elif (
            before is not None and after is not None and before.payload != after.payload
        ):
            action = "UPDATED"
        else:
            continue
        changes.append(
            AnnotationItemChange(
                kind=key[0],
                item_id=key[1],
                action=action,
                before=copy.deepcopy(before.payload) if before else None,
                after=copy.deepcopy(after.payload) if after else None,
            )
        )
    return changes
