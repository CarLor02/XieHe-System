"""影像检查类型领域约束。"""

from __future__ import annotations

SUPPORTED_EXAM_TYPES = (
    "正位X光片",
    "侧位X光片",
    "左侧曲位",
    "右侧曲位",
    "体态照片",
)


def normalize_exam_type(value: str) -> str:
    """规范化并校验可由影像中心设置的检查类型。"""

    normalized = value.strip()
    if normalized not in SUPPORTED_EXAM_TYPES:
        raise ValueError("不支持的影像检查类型")
    return normalized
