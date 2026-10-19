"""业务 POST 请求；路由参数与筛选条件统一放入 JSON body。"""

from __future__ import annotations

from pydantic import Field

from . import (
    RenameImageFileRequest,
    UpdateExamTypeRequest,
    UpdateImageInfoRequest,
)


class RequestUpdateImageInfo(UpdateImageInfoRequest):
    file_id: int = Field(...)


class RequestRenameImageFile(RenameImageFileRequest):
    file_id: int = Field(...)


class RequestUpdateExamType(UpdateExamTypeRequest):
    file_id: int = Field(...)
