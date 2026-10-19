"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from . import SaveAnnotationRequest


class RequestListAnnotationHistory(BaseModel):
    file_id: int = Field(...)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    item_kind: str | None = Field(None)
    item_id: str | None = Field(None)


class RequestGetAnnotationHistoryVersion(BaseModel):
    file_id: int = Field(...)
    version: int = Field(...)


class RequestSaveAnnotation(SaveAnnotationRequest):
    file_id: int = Field(...)
