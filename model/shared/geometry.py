from __future__ import annotations

import math


PointDict = dict[str, float]


def point(x: float, y: float) -> PointDict:
    return {"x": float(x), "y": float(y)}


def line_angle(p1: PointDict, p2: PointDict) -> float:
    angle = math.degrees(math.atan2(p2["y"] - p1["y"], p2["x"] - p1["x"]))
    if angle > 90:
        angle -= 180
    if angle < -90:
        angle += 180
    return angle


def small_angle_between(a: float, b: float) -> float:
    diff = abs(a - b) % 180
    return min(diff, 180 - diff)


def angle_between(v1: PointDict, v2: PointDict) -> float:
    dot = v1["x"] * v2["x"] + v1["y"] * v2["y"]
    mag1 = math.hypot(v1["x"], v1["y"])
    mag2 = math.hypot(v2["x"], v2["y"])
    if mag1 == 0 or mag2 == 0:
        return 0
    cos_value = max(-1, min(1, dot / (mag1 * mag2)))
    return math.degrees(math.acos(cos_value))
