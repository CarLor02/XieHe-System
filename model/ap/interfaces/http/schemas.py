from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel


class PointXY(BaseModel):
    x: float
    y: float


class Measurement(BaseModel):
    type: str
    points: list[PointXY]
    value: Optional[str] = None
    angle: Optional[float] = None
    upper_vertebra: Optional[str] = None
    lower_vertebra: Optional[str] = None
    apex_vertebra: Optional[str] = None


class AnnotationsResponse(BaseModel):
    imageId: str
    imageWidth: int
    imageHeight: int
    measurements: list[Measurement]
    vertebrae: Optional[list[dict[str, Any]]] = None
    cfh: Optional[dict[str, Any]] = None
    raw_keypoints: Optional[dict[str, Any]] = None


class ObjectImageRequest(BaseModel):
    bucket: str
    object_key: str
    image_id: Optional[str] = None
