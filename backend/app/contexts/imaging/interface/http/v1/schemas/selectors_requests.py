"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RequestListVisibleImageUploaders(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(10, ge=1, le=100)
    search: str | None = Field(None)


class RequestListAssignableImageTeams(BaseModel):
    page: int = Field(1, ge=1)
    page_size: int = Field(10, ge=1, le=50)
    search: str | None = Field(None)
