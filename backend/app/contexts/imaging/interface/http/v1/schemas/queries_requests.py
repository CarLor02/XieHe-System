"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, Field

from app.contexts.imaging.domain import ImageFileStatusEnum, ImageFileTypeEnum


class RequestListImageFiles(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    file_type: ImageFileTypeEnum | None = Field(None)
    file_status: ImageFileStatusEnum | None = Field(None)
    status_value: str | None = Field(None, alias="status")
    review_status: str | None = Field(None)
    pending_only: bool | None = Field(None)
    description: str | None = Field(None)
    start_date: date | None = Field(None)
    end_date: date | None = Field(None)
    search: str | None = Field(None)
    uploaded_by: int | None = Field(None)
    team_ids: list[int] = Field(default_factory=list)


class RequestListNavigationIds(BaseModel):
    pass


class RequestGetPatientImages(BaseModel):
    patient_id: int = Field(...)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class RequestGetImageStats(BaseModel):
    pass


class RequestGetImageFileDetail(BaseModel):
    file_id: int = Field(...)
