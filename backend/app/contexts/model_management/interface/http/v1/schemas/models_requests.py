"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel as PydanticBaseModel
from pydantic import ConfigDict, Field

from app.contexts.model_management.domain import (
    ModelViewType,
)

from . import CreateModelRequest


class BaseModel(PydanticBaseModel):
    model_config = ConfigDict(protected_namespaces=())


class RequestGetModels(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(10, ge=1, le=100, description="每页数量")
    view_type: ModelViewType | None = Field(None, description="模型类型筛选")
    search: str | None = Field(None, description="搜索关键词")


class RequestGetConfiguration(BaseModel):
    pass


class RequestGetModelStats(BaseModel):
    pass


class RequestGetModel(BaseModel):
    model_id: str = Field(...)


class RequestUpdateModel(CreateModelRequest):
    model_id: str = Field(...)


class RequestRefreshModelStatus(BaseModel):
    model_id: str = Field(...)


class RequestActivateModel(BaseModel):
    model_id: str = Field(...)


class RequestDeleteModel(BaseModel):
    model_id: str = Field(...)
