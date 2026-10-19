"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field


class RequestGetDashboardOverview(BaseModel):
    pass


class RequestGetRecentActivities(BaseModel):
    limit: int = Field(10, ge=1, le=50, description="返回数量限制")


class RequestGetDashboardStats(BaseModel):
    pass
