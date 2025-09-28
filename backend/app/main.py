"""
医疗影像诊断系统 - FastAPI 应用主文件

这是 FastAPI 应用的核心文件，负责：
1. 创建和配置 FastAPI 应用实例
2. 注册中间件和异常处理器
3. 配置 CORS 和安全设置
4. 注册 API 路由
5. 设置应用生命周期事件

作者: 医疗影像团队
创建时间: 2025-09-24
版本: 1.0.0
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.core.config import settings
from app.core.exceptions import (
    CustomHTTPException,
    ValidationException,
    custom_http_exception_handler,
    http_exception_handler,
    validation_exception_handler,
)
from app.core.logging import setup_logging
from app.db.session import engine
from app.services.realtime_service import start_realtime_service, stop_realtime_service


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理
    
    在应用启动和关闭时执行必要的初始化和清理工作。
    """
    # 启动时执行
    setup_logging()

    # 获取logger
    import logging
    logger = logging.getLogger(__name__)

    # 初始化数据库连接
    from app.core.database import db_manager
    try:
        db_manager.connect()
        logger.info("✅ 数据库连接初始化成功")
    except Exception as e:
        logger.error(f"❌ 数据库连接初始化失败: {e}")

    # 启动实时数据推送服务
    try:
        import asyncio
        asyncio.create_task(start_realtime_service())
        logger.info("✅ 实时数据推送服务启动成功")
    except Exception as e:
        logger.error(f"❌ 实时数据推送服务启动失败: {e}")

    # 这里可以添加其他启动时的初始化工作
    # 例如：缓存预热、AI模型加载等

    yield
    
    # 关闭时执行
    # 停止实时数据推送服务
    try:
        await stop_realtime_service()
        logger.info("✅ 实时数据推送服务停止成功")
    except Exception as e:
        logger.error(f"❌ 实时数据推送服务停止失败: {e}")

    # 清理数据库连接
    try:
        db_manager.disconnect()
        logger.info("✅ 数据库连接清理完成")
    except Exception as e:
        logger.error(f"❌ 数据库连接清理失败: {e}")

    # 清理异步引擎
    if engine:
        await engine.dispose()


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENVIRONMENT != "production" else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.ENVIRONMENT != "production" else None,
    lifespan=lifespan,
)

# 配置 CORS 中间件
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 配置受信任主机中间件
if settings.ALLOWED_HOSTS:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


# 注册异常处理器
app.add_exception_handler(CustomHTTPException, custom_http_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(ValidationException, validation_exception_handler)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    添加安全头部中间件
    
    为所有响应添加安全相关的 HTTP 头部。
    """
    response = await call_next(request)
    
    # 安全头部
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    
    # 如果是 HTTPS，添加 HSTS 头部
    if request.url.scheme == "https":
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    
    return response


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """
    添加处理时间头部中间件
    
    记录请求处理时间并添加到响应头部。
    """
    import time
    
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    
    return response


# 注册 API 路由
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Root"])
async def root():
    """
    根路径端点
    
    返回应用基本信息。
    """
    return {
        "message": "医疗影像诊断系统 API",
        "version": settings.VERSION,
        "docs_url": f"{settings.API_V1_STR}/docs",
        "redoc_url": f"{settings.API_V1_STR}/redoc",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """
    健康检查端点

    用于容器健康检查和负载均衡器探测。
    """
    return {
        "status": "healthy",
        "message": "XieHe医疗影像诊断系统运行正常"
    }


@app.get("/dashboard/overview", tags=["Dashboard"])
async def simple_dashboard_overview():
    """
    简单仪表盘概览端点
    """
    from datetime import datetime
    return {
        "total_patients": 3,
        "new_patients_today": 1,
        "new_patients_week": 2,
        "active_patients": 3,
        "total_studies": 5,
        "studies_today": 2,
        "studies_week": 4,
        "pending_studies": 1,
        "total_reports": 4,
        "pending_reports": 1,
        "completed_reports": 3,
        "overdue_reports": 0,
        "completion_rate": 75.0,
        "average_processing_time": 2.5,
        "system_alerts": 0,
        "generated_at": datetime.now().isoformat()
    }


@app.get("/info", tags=["Info"])
async def app_info():
    """
    应用信息端点

    返回应用的详细信息。
    """
    return {
        "name": settings.PROJECT_NAME,
        "description": settings.PROJECT_DESCRIPTION,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "api_version": "v1",
    }


# 临时仪表盘端点
@app.get("/api/v1/dashboard/overview", tags=["Dashboard"])
async def dashboard_overview():
    """
    仪表盘概览端点

    返回系统概览统计信息。
    """
    from datetime import datetime
    return {
        "total_patients": 3,
        "new_patients_today": 1,
        "new_patients_week": 2,
        "active_patients": 3,
        "total_studies": 5,
        "studies_today": 2,
        "studies_week": 4,
        "pending_studies": 1,
        "total_reports": 4,
        "pending_reports": 1,
        "completed_reports": 3,
        "overdue_reports": 0,
        "completion_rate": 75.0,
        "average_processing_time": 2.5,
        "system_alerts": 0,
        "generated_at": datetime.now().isoformat()
    }


# 如果直接运行此文件，启动开发服务器
if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
