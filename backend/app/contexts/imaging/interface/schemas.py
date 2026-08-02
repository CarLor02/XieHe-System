"""影像 context 的 HTTP schema。"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class SaveAnnotationRequest(BaseModel):
    expected_version: int = Field(ge=0)
    annotation: dict[str, Any]


class AnnotationBatchRequest(BaseModel):
    ids: list[int] = Field(min_length=1, max_length=100)

    @field_validator("ids")
    @classmethod
    def normalize_ids(cls, value: list[int]) -> list[int]:
        normalized = list(dict.fromkeys(value))
        if any(image_file_id <= 0 for image_file_id in normalized):
            raise ValueError("影像ID必须为正整数")
        return normalized


class AnnotationSaveResponse(BaseModel):
    annotation_version: int
    annotation_updated_at: datetime | None
    annotation_updated_by: int | None
    has_annotation: bool
    status: str
    changed: bool
