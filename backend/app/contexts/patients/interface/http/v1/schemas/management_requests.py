"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from . import PatientUpdate


class RequestGetPatients(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    search: str | None = Field(None)
    gender: str | None = Field(None)
    age_min: int | None = Field(None, ge=0, le=150)
    age_max: int | None = Field(None, ge=0, le=150)
    status_filter: str | None = Field(None, alias="status")
    has_images: bool | None = Field(None)
    sort_by: str = Field("created_at")
    sort_order: str = Field("desc")


class RequestGetPatient(BaseModel):
    patient_id: int = Field(...)


class RequestUpdatePatient(PatientUpdate):
    patient_id: int = Field(...)


class RequestDeletePatient(BaseModel):
    patient_id: int = Field(...)
