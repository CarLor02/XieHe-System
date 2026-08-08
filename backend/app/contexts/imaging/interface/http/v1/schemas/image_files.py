"""影像文件 HTTP v1 schema 与应用读模型映射。"""

from __future__ import annotations

from dataclasses import asdict
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, JsonValue, field_validator

from app.contexts.imaging.application.dto import ImageDetail, ImageSummary


class ImageFileResponse(BaseModel):
    id: int
    file_uuid: str
    original_filename: str
    file_type: str
    mime_type: str | None
    file_size: int
    storage_bucket: str
    object_key: str
    storage_etag: str | None
    thumbnail_path: str | None
    uploaded_by: int
    uploader_name: str | None = None
    patient_id: int | None
    patient_name: str | None = None
    patient_identifier: str | None = None
    patient_gender: str | None = None
    patient_age: int | None = None
    team_ids: list[int] = Field(default_factory=list)
    team_names: list[str] = Field(default_factory=list)
    study_date: datetime | None
    description: str | None
    annotation: dict[str, JsonValue] | None = None
    annotation_version: int = 0
    has_annotation: bool = False
    annotation_created_at: datetime | None = None
    annotation_created_by: int | None = None
    annotation_updated_at: datetime | None = None
    annotation_updated_by: int | None = None
    status: str
    upload_progress: int
    created_at: datetime
    uploaded_at: datetime | None

    @classmethod
    def from_summary(cls, summary: ImageSummary) -> ImageFileResponse:
        return cls(**asdict(summary))

    @classmethod
    def from_detail(cls, detail: ImageDetail) -> ImageFileResponse:
        return cls(
            **asdict(detail.summary),
            patient_gender=detail.patient_gender,
            patient_age=detail.patient_age,
            annotation=detail.annotation,
            annotation_version=detail.annotation_version,
            annotation_created_at=detail.annotation_created_at,
            annotation_created_by=detail.annotation_created_by,
            annotation_updated_at=detail.annotation_updated_at,
            annotation_updated_by=detail.annotation_updated_by,
        )


class UpdateExamTypeRequest(BaseModel):
    description: str = Field(description="检查类型（正位X光片/侧位X光片等）")


class BatchUpdateExamTypeRequest(BaseModel):
    ids: list[int] = Field(
        min_length=1,
        max_length=1000,
        description="待修改的影像文件ID列表",
    )
    exam_type: str = Field(min_length=1, description="目标影像检查类型")

    @field_validator("ids")
    @classmethod
    def normalize_ids(cls, value: list[int]) -> list[int]:
        normalized = list(dict.fromkeys(value))
        if any(image_file_id <= 0 for image_file_id in normalized):
            raise ValueError("影像ID必须为正整数")
        return normalized


class UpdateImageInfoRequest(BaseModel):
    description: str = Field(description="检查类型（正位X光片/侧位X光片等）")
    team_ids: list[int] = Field(default_factory=list, description="影像归属团队ID")


class RenameImageFileRequest(BaseModel):
    basename: str = Field(
        min_length=1,
        max_length=255,
        description="不含扩展名的新影像名",
    )

    @field_validator("basename", mode="before")
    @classmethod
    def validate_basename(cls, value: object) -> object:
        if not isinstance(value, str):
            return value
        normalized = value.strip()
        if not normalized:
            raise ValueError("新影像名不能为空")
        if "/" in normalized or "\\" in normalized:
            raise ValueError("新影像名不能包含路径分隔符")
        if any(ord(character) < 32 for character in normalized):
            raise ValueError("新影像名不能包含控制字符")
        return normalized


class BatchDownloadUrlsRequest(BaseModel):
    ids: list[int] = Field(
        min_length=1,
        max_length=100,
        description="影像文件ID列表",
    )
    variant: Literal["original"] = Field(
        default="original",
        description="访问对象类型",
    )
