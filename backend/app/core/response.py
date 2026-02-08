"""
统一API响应格式模块

提供标准化的API响应格式，包括成功响应、分页响应和错误响应。
"""

from typing import TypeVar, Generic, Optional, List, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


T = TypeVar('T')


class PaginationMeta(BaseModel):
    """分页元数据"""
    total: int = Field(..., description="总记录数")
    page: int = Field(..., description="当前页码")
    page_size: int = Field(..., description="每页记录数")
    total_pages: int = Field(..., description="总页数")


class ErrorDetail(BaseModel):
    """错误详情"""
    field: Optional[str] = Field(None, description="错误字段")
    message: str = Field(..., description="错误消息")
    type: Optional[str] = Field(None, description="错误类型")


class ApiResponse(BaseModel, Generic[T]):
    """统一API成功响应格式"""
    code: int = Field(200, description="业务状态码")
    message: str = Field("操作成功", description="响应消息")
    data: Optional[T] = Field(None, description="响应数据")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="响应时间戳")

    class Config:
        json_schema_extra = {
            "example": {
                "code": 200,
                "message": "操作成功",
                "data": {"key": "value"},
                "timestamp": "2026-02-08T10:00:00"
            }
        }


class PaginatedData(BaseModel, Generic[T]):
    """分页数据"""
    items: List[T] = Field(..., description="数据列表")
    pagination: PaginationMeta = Field(..., description="分页信息")


class ErrorResponse(BaseModel):
    """统一API错误响应格式"""
    code: int = Field(..., description="HTTP状态码")
    message: str = Field(..., description="错误消息")
    error_code: str = Field(..., description="错误码")
    details: Optional[List[ErrorDetail]] = Field(None, description="错误详情列表")
    path: Optional[str] = Field(None, description="请求路径")
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat(), description="响应时间戳")

    class Config:
        json_schema_extra = {
            "example": {
                "code": 400,
                "message": "请求参数错误",
                "error_code": "VALIDATION_ERROR",
                "details": [
                    {
                        "field": "email",
                        "message": "邮箱格式不正确",
                        "type": "value_error"
                    }
                ],
                "path": "/api/v1/users",
                "timestamp": "2026-02-08T10:00:00"
            }
        }


def success_response(
    data: Any = None,
    message: str = "操作成功",
    code: int = 200
) -> Dict[str, Any]:
    """
    创建成功响应

    Args:
        data: 响应数据
        message: 响应消息
        code: 业务状态码

    Returns:
        标准化的成功响应字典
    """
    return {
        "code": code,
        "message": message,
        "data": data,
        "timestamp": datetime.now().isoformat()
    }


def paginated_response(
    items: List[Any],
    total: int,
    page: int,
    page_size: int,
    message: str = "查询成功"
) -> Dict[str, Any]:
    """
    创建分页响应

    Args:
        items: 数据列表
        total: 总记录数
        page: 当前页码
        page_size: 每页记录数
        message: 响应消息

    Returns:
        标准化的分页响应字典
    """
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0

    return {
        "code": 200,
        "message": message,
        "data": {
            "items": items,
            "pagination": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
        },
        "timestamp": datetime.now().isoformat()
    }


def error_response(
    message: str,
    error_code: str,
    code: int = 400,
    details: Optional[List[Dict[str, Any]]] = None,
    path: Optional[str] = None
) -> Dict[str, Any]:
    """
    创建错误响应

    Args:
        message: 错误消息
        error_code: 错误码
        code: HTTP状态码
        details: 错误详情列表
        path: 请求路径

    Returns:
        标准化的错误响应字典
    """
    response = {
        "code": code,
        "message": message,
        "error_code": error_code,
        "timestamp": datetime.now().isoformat()
    }

    if details is not None:
        response["details"] = details

    if path is not None:
        response["path"] = path

    return response
