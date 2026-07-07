from __future__ import annotations

from typing import Any

from shared.geometry import line_angle, point, small_angle_between


Point = dict[str, float]

VERTEBRA_ORDER = [
    "C7",
    "T1",
    "T2",
    "T3",
    "T4",
    "T5",
    "T6",
    "T7",
    "T8",
    "T9",
    "T10",
    "T11",
    "T12",
    "L1",
    "L2",
    "L3",
    "L4",
    "L5",
]
ORDER_INDEX = {name: index for index, name in enumerate(VERTEBRA_ORDER)}


def _frontal_corners(vertebra: dict[str, Any]) -> dict[str, Point]:
    corners = vertebra["corners"]
    tl = corners.get("top_left") or corners.get("topLeft")
    tr = corners.get("top_right") or corners.get("topRight")
    bl = corners.get("bottom_left") or corners.get("bottomLeft")
    br = corners.get("bottom_right") or corners.get("bottomRight")
    top_left = point(tl["x"], tl["y"])
    top_right = point(tr["x"], tr["y"])
    bottom_left = point(bl["x"], bl["y"])
    bottom_right = point(br["x"], br["y"])
    return {
        "top_left": top_left,
        "top_right": top_right,
        "bottom_left": bottom_left,
        "bottom_right": bottom_right,
        "center": point(
            (top_left["x"] + top_right["x"] + bottom_left["x"] + bottom_right["x"]) / 4,
            (top_left["y"] + top_right["y"] + bottom_left["y"] + bottom_right["y"]) / 4,
        ),
    }


def as_corners(vertebra: dict[str, Any]) -> dict[str, Point]:
    if "corners" in vertebra:
        return _frontal_corners(vertebra)
    return {
        "top_left": point(vertebra["top_left"]["x"], vertebra["top_left"]["y"]),
        "top_right": point(vertebra["top_right"]["x"], vertebra["top_right"]["y"]),
        "bottom_left": point(vertebra["bottom_left"]["x"], vertebra["bottom_left"]["y"]),
        "bottom_right": point(vertebra["bottom_right"]["x"], vertebra["bottom_right"]["y"]),
        "center": point(
            vertebra.get("center", {}).get("x", 0),
            vertebra.get("center", {}).get("y", 0),
        ),
    }


def signed_cobb(upper: dict[str, Any], lower: dict[str, Any]) -> tuple[float, float, float, float]:
    upper_corners = as_corners(upper)
    lower_corners = as_corners(lower)
    upper_angle = line_angle(upper_corners["top_left"], upper_corners["top_right"])
    lower_angle = line_angle(lower_corners["bottom_left"], lower_corners["bottom_right"])
    magnitude = small_angle_between(upper_angle, lower_angle)
    left_span = abs(lower_corners["bottom_left"]["y"] - upper_corners["top_left"]["y"])
    right_span = abs(lower_corners["bottom_right"]["y"] - upper_corners["top_right"]["y"])
    sign = 1 if left_span > right_span else -1
    return sign * magnitude, magnitude, upper_angle, lower_angle


def all_candidates(vertebrae: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    names = [name for name in VERTEBRA_ORDER if name in vertebrae]
    rows: list[dict[str, Any]] = []
    for upper_index, upper_name in enumerate(names):
        for lower_name in names[upper_index + 1 :]:
            signed, magnitude, upper_angle, lower_angle = signed_cobb(
                vertebrae[upper_name],
                vertebrae[lower_name],
            )
            rows.append(
                {
                    "upper_vertebra": upper_name,
                    "lower_vertebra": lower_name,
                    "signed_cobb_v2": round(signed, 6),
                    "abs_cobb_v2": round(magnitude, 6),
                    "upper_endplate_angle": round(upper_angle, 6),
                    "lower_endplate_angle": round(lower_angle, 6),
                    "vertebra_span": ORDER_INDEX[lower_name] - ORDER_INDEX[upper_name],
                }
            )
    return rows


def select_nonoverlapping(
    candidates: list[dict[str, Any]],
    limit: int = 3,
    threshold: float = 10.0,
    min_span: int = 3,
) -> list[dict[str, Any]]:
    selected: list[dict[str, Any]] = []
    for row in sorted(candidates, key=lambda item: float(item["abs_cobb_v2"]), reverse=True):
        if len(selected) >= limit:
            break
        if float(row["abs_cobb_v2"]) < threshold or int(row["vertebra_span"]) < min_span:
            continue
        start = ORDER_INDEX[row["upper_vertebra"]]
        end = ORDER_INDEX[row["lower_vertebra"]]
        overlaps = False
        for chosen in selected:
            chosen_start = ORDER_INDEX[chosen["upper_vertebra"]]
            chosen_end = ORDER_INDEX[chosen["lower_vertebra"]]
            overlap = max(0, min(end, chosen_end) - max(start, chosen_start))
            if overlap > 1:
                overlaps = True
                break
        if not overlaps:
            selected.append({**row, "auto_rank": len(selected) + 1})
    return selected
