"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel, Field

from . import ReportUpdate


class RequestGetReports(BaseModel):
    page: int = Field(1, ge=1, description="页码")
    page_size: int = Field(20, ge=1, le=100, description="每页数量")
    patient_id: int | None = Field(None, description="患者ID筛选")
    report_status: str | None = Field(None, alias="status", description="状态筛选")
    priority: str | None = Field(None, description="优先级筛选")
    search: str | None = Field(None, description="搜索关键词")


class RequestGetReport(BaseModel):
    report_id: int = Field(...)


class RequestUpdateReport(ReportUpdate):
    report_id: int = Field(...)


class RequestDeleteReport(BaseModel):
    report_id: int = Field(...)
