"""
异常处理模块

定义自定义异常类和异常处理器，提供统一的错误响应格式。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

from typing import Any, Dict, Optional
from fastapi import HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging

from app.core.response import error_response
from app.core.error_codes import ErrorCode

logger = logging.getLogger(__name__)


class CustomHTTPException(HTTPException):
    """自定义HTTP异常类"""
    
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None,
        error_type: Optional[str] = None,
    ) -> None:
        super().__init__(status_code, detail, headers)
        self.error_code = error_code
        self.error_type = error_type


class ValidationException(Exception):
    """数据验证异常"""
    
    def __init__(self, message: str, field: Optional[str] = None):
        self.message = message
        self.field = field
        super().__init__(self.message)


class DatabaseException(Exception):
    """数据库操作异常"""
    
    def __init__(self, message: str, operation: Optional[str] = None):
        self.message = message
        self.operation = operation
        super().__init__(self.message)


class AuthenticationException(CustomHTTPException):
    """认证异常"""
    
    def __init__(self, detail: str = "认证失败"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTH_FAILED",
            error_type="authentication"
        )


class AuthorizationException(CustomHTTPException):
    """授权异常"""
    
    def __init__(self, detail: str = "权限不足"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            error_code="PERMISSION_DENIED",
            error_type="authorization"
        )


class ResourceNotFoundException(CustomHTTPException):
    """资源未找到异常"""
    
    def __init__(self, resource: str = "资源", resource_id: Any = None):
        detail = f"{resource}未找到"
        if resource_id:
            detail += f" (ID: {resource_id})"
        
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            error_code="RESOURCE_NOT_FOUND",
            error_type="not_found"
        )


class BusinessLogicException(CustomHTTPException):
    """业务逻辑异常"""
    
    def __init__(self, detail: str, error_code: str = "BUSINESS_ERROR"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code=error_code,
            error_type="business_logic"
        )


# 异常处理器
async def custom_http_exception_handler(
    request: Request, exc: CustomHTTPException
) -> JSONResponse:
    """自定义HTTP异常处理器"""

    logger.error(
        f"Custom HTTP Exception: {exc.status_code} - {exc.detail} "
        f"- Path: {request.url.path} - Method: {request.method}"
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            message=exc.detail,
            error_code=exc.error_code or ErrorCode.UNKNOWN_ERROR,
            code=exc.status_code,
            path=str(request.url.path)
        ),
        headers=exc.headers,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """标准HTTP异常处理器"""

    logger.error(
        f"HTTP Exception: {exc.status_code} - {exc.detail} "
        f"- Path: {request.url.path} - Method: {request.method}"
    )

    return JSONResponse(
        status_code=exc.status_code,
        content=error_response(
            message=str(exc.detail),
            error_code=ErrorCode.UNKNOWN_ERROR,
            code=exc.status_code,
            path=str(request.url.path)
        ),
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """请求验证异常处理器"""

    logger.error(
        f"Validation Exception: {exc.errors()} "
        f"- Path: {request.url.path} - Method: {request.method}"
    )

    # 格式化验证错误信息
    errors = []
    for error in exc.errors():
        field = ".".join(str(loc) for loc in error["loc"])
        errors.append({
            "field": field,
            "message": error["msg"],
            "type": error["type"]
        })

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_response(
            message="请求数据验证失败",
            error_code=ErrorCode.VALIDATION_ERROR,
            code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=errors,
            path=str(request.url.path)
        ),
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """通用异常处理器"""

    logger.error(
        f"Unhandled Exception: {type(exc).__name__}: {str(exc)} "
        f"- Path: {request.url.path} - Method: {request.method}",
        exc_info=True
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=error_response(
            message="内部服务器错误",
            error_code=ErrorCode.INTERNAL_ERROR,
            code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            path=str(request.url.path)
        ),
    )
