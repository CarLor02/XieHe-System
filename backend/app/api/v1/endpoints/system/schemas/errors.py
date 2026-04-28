"""Schemas for the errors API endpoints."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

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
    context: Optional[Dict[str, Any]] = Field(None, description="错误上下文")


class ErrorReportResponse(BaseModel):
    """错误报告响应模型"""
    success: bool = Field(..., description="是否成功")
    errorId: str = Field(..., description="错误ID")
    message: str = Field(..., description="响应消息")


class ErrorStats(BaseModel):
    """错误统计模型"""
    totalErrors: int = Field(..., description="总错误数")
    errorsByType: Dict[str, int] = Field(..., description="按类型分组的错误数")
    errorsBySeverity: Dict[str, int] = Field(..., description="按严重程度分组的错误数")
    recentErrors: List[Dict[str, Any]] = Field(..., description="最近的错误")
    timeRange: str = Field(..., description="统计时间范围")
