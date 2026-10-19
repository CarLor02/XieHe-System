"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import BaseModel


class RequestGetCurrentUserInfo(BaseModel):
    pass
