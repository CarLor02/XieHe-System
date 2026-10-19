"""Schemas for the errors API endpoints."""

from typing import Dict, List, Optional, TypedDict

from pydantic import BaseModel, Field, JsonValue


class ErrorReport(BaseModel):
    """前端错误报告模型"""

    message: str = Field(..., description="错误消息")
    stack: Optional[str] = Field(None, description="错误堆栈")
    componentStack: Optional[str] = Field(None, description="组件堆栈")
    timestamp: str = Field(..., description="错误时间戳")
    url: str = Field(..., description="发生错误的URL")
    userAgent: str = Field(..., description="用户代理")
    errorId: str = Field(..., description="错误ID")
    type: Optional[str] = Field("unknown", description="错误类型")
    severity: Optional[str] = Field("medium", description="错误严重程度")
    userId: Optional[str] = Field(None, description="用户ID")
    sessionId: Optional[str] = Field(None, description="会话ID")
    context: dict[str, JsonValue] | None = Field(None, description="错误上下文")


class ErrorReportResponse(BaseModel):
    """错误报告响应模型"""

    errorId: str = Field(..., description="错误ID")


class RecentError(BaseModel):
    id: str
    message: str
    type: str | None
    severity: str | None
    timestamp: str
    url: str
    userId: str | None


class ErrorStats(BaseModel):
    """错误统计模型"""

    totalErrors: int = Field(..., description="总错误数")
    errorsByType: Dict[str, int] = Field(..., description="按类型分组的错误数")
    errorsBySeverity: Dict[str, int] = Field(..., description="按严重程度分组的错误数")
    recentErrors: List[RecentError] = Field(..., description="最近的错误")
    timeRange: str = Field(..., description="统计时间范围")


class RequestErrorStats(BaseModel):
    hours: int = Field(24, ge=1, le=8760)


class ClearedErrorsResult(BaseModel):
    clearedCount: int


class StoredError(TypedDict):
    id: str
    message: str
    stack: str | None
    componentStack: str | None
    timestamp: str
    url: str
    userAgent: str
    type: str | None
    severity: str | None
    userId: str | None
    sessionId: str | None
    context: dict[str, JsonValue] | None
    clientIp: str
    serverTimestamp: str
