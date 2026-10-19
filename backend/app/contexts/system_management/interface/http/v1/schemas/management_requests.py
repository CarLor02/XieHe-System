"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RequestGetSystemConfigs(BaseModel):
    config_type: str | None = Field(None, description="配置类型筛选")
    is_system: bool | None = Field(None, description="是否系统配置")


class RequestGetSystemStats(BaseModel):
    pass
