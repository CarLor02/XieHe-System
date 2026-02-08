"""
错误报告和监控API端点

提供前端错误报告、错误统计和监控功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
import logging
import json

from app.core.auth import get_current_active_user
from app.core.database import get_db
from app.core.exceptions import ValidationException
from app.core.response import success_response, paginated_response
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter()


# 错误报告模型
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


# 内存中的错误存储（生产环境应使用数据库）
error_storage: List[Dict[str, Any]] = []
MAX_STORED_ERRORS = 1000


@router.post("/report", response_model=Dict[str, Any])
async def report_error(
    error_report: ErrorReport,
    background_tasks: BackgroundTasks,
    request: Request,
    db: Session = Depends(get_db)
):
    """
    接收前端错误报告
    
    Args:
        error_report: 错误报告数据
        background_tasks: 后台任务
        request: 请求对象
        db: 数据库会话
    
    Returns:
        ErrorReportResponse: 错误报告响应
    """
    try:
        # 获取客户端IP
        client_ip = request.client.host if request.client else "unknown"
        
        # 构建完整的错误记录
        error_record = {
            "id": error_report.errorId,
            "message": error_report.message,
            "stack": error_report.stack,
            "componentStack": error_report.componentStack,
            "timestamp": error_report.timestamp,
            "url": error_report.url,
            "userAgent": error_report.userAgent,
            "type": error_report.type,
            "severity": error_report.severity,
            "userId": error_report.userId,
            "sessionId": error_report.sessionId,
            "context": error_report.context,
            "clientIp": client_ip,
            "serverTimestamp": datetime.now().isoformat()
        }
        
        # 存储错误记录
        error_storage.append(error_record)
        
        # 保持存储大小限制
        if len(error_storage) > MAX_STORED_ERRORS:
            error_storage.pop(0)
        
        # 记录到日志
        logger.error(
            f"Frontend Error Report - ID: {error_report.errorId}, "
            f"Type: {error_report.type}, Severity: {error_report.severity}, "
            f"Message: {error_report.message}, URL: {error_report.url}, "
            f"User: {error_report.userId}, IP: {client_ip}"
        )
        
        # 后台处理错误
        background_tasks.add_task(
            process_error_report,
            error_record
        )

        return success_response(
            data={
                "errorId": error_report.errorId
            },
            message="错误报告已接收"
        )
        
    except Exception as e:
        logger.error(f"处理错误报告失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="处理错误报告失败"
        )


@router.get("/stats", response_model=Dict[str, Any])
async def get_error_stats(
    hours: int = 24,
    current_user: dict = Depends(get_current_active_user)
):
    """
    获取错误统计信息
    
    Args:
        hours: 统计时间范围（小时）
        current_user: 当前用户
    
    Returns:
        ErrorStats: 错误统计信息
    """
    try:
        # 检查权限（只有管理员可以查看错误统计）
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        
        # 计算时间范围
        cutoff_time = datetime.now() - timedelta(hours=hours)
        cutoff_timestamp = cutoff_time.isoformat()
        
        # 过滤指定时间范围内的错误
        recent_errors = [
            error for error in error_storage
            if error.get("serverTimestamp", "") >= cutoff_timestamp
        ]
        
        # 统计错误类型
        errors_by_type = {}
        for error in recent_errors:
            error_type = error.get("type", "unknown")
            errors_by_type[error_type] = errors_by_type.get(error_type, 0) + 1
        
        # 统计错误严重程度
        errors_by_severity = {}
        for error in recent_errors:
            severity = error.get("severity", "medium")
            errors_by_severity[severity] = errors_by_severity.get(severity, 0) + 1
        
        # 获取最近的错误（最多20条）
        recent_error_list = sorted(
            recent_errors,
            key=lambda x: x.get("serverTimestamp", ""),
            reverse=True
        )[:20]
        
        # 清理敏感信息
        cleaned_recent_errors = []
        for error in recent_error_list:
            cleaned_error = {
                "id": error.get("id"),
                "message": error.get("message"),
                "type": error.get("type"),
                "severity": error.get("severity"),
                "timestamp": error.get("timestamp"),
                "url": error.get("url"),
                "userId": error.get("userId")
            }
            cleaned_recent_errors.append(cleaned_error)

        return success_response(
            data={
                "totalErrors": len(recent_errors),
                "errorsByType": errors_by_type,
                "errorsBySeverity": errors_by_severity,
                "recentErrors": cleaned_recent_errors,
                "timeRange": f"最近 {hours} 小时"
            },
            message="获取错误统计成功"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取错误统计失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取错误统计失败"
        )


@router.delete("/clear", response_model=Dict[str, Any])
async def clear_error_logs(
    current_user: dict = Depends(get_current_active_user)
):
    """
    清空错误日志
    
    Args:
        current_user: 当前用户
    
    Returns:
        dict: 操作结果
    """
    try:
        # 检查权限（只有超级管理员可以清空错误日志）
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="权限不足"
            )
        
        # 记录操作
        logger.info(f"用户 {current_user.username} 清空了错误日志")

        # 清空错误存储
        error_count = len(error_storage)
        error_storage.clear()

        return success_response(
            data={
                "clearedCount": error_count
            },
            message=f"已清空 {error_count} 条错误记录"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"清空错误日志失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="清空错误日志失败"
        )


async def process_error_report(error_record: Dict[str, Any]):
    """
    后台处理错误报告
    
    Args:
        error_record: 错误记录
    """
    try:
        # 检查是否为严重错误
        severity = error_record.get("severity", "medium")
        error_type = error_record.get("type", "unknown")
        
        # 严重错误处理
        if severity in ["critical", "high"]:
            await handle_critical_error(error_record)
        
        # 特定类型错误处理
        if error_type == "network":
            await handle_network_error(error_record)
        elif error_type == "authentication":
            await handle_auth_error(error_record)
        
        # 错误模式检测
        await detect_error_patterns(error_record)
        
    except Exception as e:
        logger.error(f"后台处理错误报告失败: {e}")


async def handle_critical_error(error_record: Dict[str, Any]):
    """处理严重错误"""
    logger.critical(
        f"严重错误检测 - ID: {error_record.get('id')}, "
        f"消息: {error_record.get('message')}, "
        f"用户: {error_record.get('userId')}"
    )
    
    # 这里可以添加告警通知逻辑
    # 例如：发送邮件、短信、Slack通知等


async def handle_network_error(error_record: Dict[str, Any]):
    """处理网络错误"""
    logger.warning(f"网络错误检测 - {error_record.get('message')}")
    
    # 这里可以添加网络监控逻辑


async def handle_auth_error(error_record: Dict[str, Any]):
    """处理认证错误"""
    logger.warning(f"认证错误检测 - 用户: {error_record.get('userId')}")
    
    # 这里可以添加安全监控逻辑


async def detect_error_patterns(error_record: Dict[str, Any]):
    """检测错误模式"""
    # 这里可以添加错误模式检测逻辑
    # 例如：同一用户短时间内多次错误、特定页面错误率过高等
    pass
