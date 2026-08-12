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

import typing
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.api.v1 import api_router
from app.contexts.imaging.infrastructure.ai import (
    start_ai_measurement_client,
    stop_ai_measurement_client,
)
from app.contexts.imaging.infrastructure.messaging import (
    start_ai_task_publisher,
    stop_ai_task_publisher,
)
from app.contexts.object_lifecycle.interface.scheduler import (
    start_object_cleanup_scheduler,
    stop_object_cleanup_scheduler,
)
from app.core.config import settings
from app.core.system.exceptions import (
    CustomHTTPException,
    ValidationException,
    custom_http_exception_handler,
    http_exception_handler,
    redis_state_unavailable_handler,
    validation_exception_handler,
)
from app.core.system.logger import LogLevel, logger
from app.core.system.request_context import request_id_var
from app.shared.cache.aiocache import query_cache
from app.shared.redis import RedisStateUnavailable, state_redis
from app.shared.storage import storage_service_client


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    应用生命周期管理

    在应用启动和关闭时执行必要的初始化和清理工作。
    """
    # 初始化数据库连接
    from app.shared.database import db_manager

    try:
        db_manager.connect()
        logger.emit_event(LogLevel.INFO, message="✅ 数据库连接初始化成功")
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"❌ 数据库连接初始化失败: {e}")

    try:
        await state_redis.start()
        logger.emit_event(LogLevel.INFO, message="✅ Redis状态存储连接成功")
    except Exception as e:
        # Security-state operations fail closed until the state instance recovers.
        logger.emit_event(LogLevel.ERROR, message=f"❌ Redis状态存储连接失败: {e}")

    try:
        await query_cache.start()
        logger.emit_event(LogLevel.INFO, message="✅ Redis查询缓存连接成功")
    except Exception as e:
        # Query services remain available and fall back to MySQL.
        logger.emit_event(
            LogLevel.WARNING, message=f"Redis查询缓存不可用，将回退数据库: {e}"
        )

    # 启动内部客户端与对象清理任务。
    try:
        import asyncio

        await storage_service_client.start()
        await start_ai_measurement_client()
        asyncio.create_task(start_object_cleanup_scheduler())
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"❌ 内部服务启动失败: {e}")

    try:
        await start_ai_task_publisher()
        logger.emit_event(LogLevel.INFO, message="✅ AI任务 Publisher 启动成功")
    except Exception as e:
        # Upload completion remains durable in MySQL and can be re-enqueued.
        logger.emit_event(LogLevel.ERROR, message=f"❌ AI任务 Publisher 启动失败: {e}")

    # 这里可以添加其他启动时的初始化工作
    # 例如：缓存预热、AI模型加载等

    yield

    # 关闭时执行
    try:
        await stop_object_cleanup_scheduler()
        logger.emit_event(LogLevel.INFO, message="✅ 对象清理调度器停止成功")
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"❌ 对象清理调度器停止失败: {e}")

    # 清理数据库连接
    try:
        await stop_ai_task_publisher()
        await stop_ai_measurement_client()
        await storage_service_client.stop()
        logger.emit_event(LogLevel.INFO, message="✅ 内部HTTP客户端已关闭")
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"❌ 内部HTTP客户端关闭失败: {e}")

    # 清理数据库连接
    try:
        db_manager.disconnect()
        logger.emit_event(LogLevel.INFO, message="✅ 数据库连接清理完成")
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"❌ 数据库连接清理失败: {e}")

    try:
        await query_cache.stop()
        await state_redis.stop()
        logger.emit_event(LogLevel.INFO, message="✅ Redis连接清理完成")
    except Exception as e:
        logger.emit_event(LogLevel.ERROR, message=f"❌ Redis连接清理失败: {e}")


# 创建 FastAPI 应用实例
app = FastAPI(
    title=settings.PROJECT_NAME,
    description=settings.PROJECT_DESCRIPTION,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
    if settings.ENVIRONMENT != "production"
    else None,
    docs_url=f"{settings.API_V1_STR}/docs"
    if settings.ENVIRONMENT != "production"
    else None,
    redoc_url=f"{settings.API_V1_STR}/redoc"
    if settings.ENVIRONMENT != "production"
    else None,
    lifespan=lifespan,
    redirect_slashes=False,  # 禁用自动重定向斜杠，避免认证头丢失
)

# 配置 CORS 中间件 - 允许所有来源（生产环境应该限制）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有来源
    allow_credentials=False,  # 允许所有来源时必须设置为 False
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
app.add_exception_handler(RedisStateUnavailable, redis_state_unavailable_handler)


@app.middleware("http")
async def add_request_id_header(request: Request, call_next: typing.Any) -> typing.Any:
    request_id = request.headers.get("X-Request-ID") or uuid4().hex
    token = request_id_var.set(request_id)
    try:
        response = await call_next(request)
    finally:
        request_id_var.reset(token)
    response.headers["X-Request-ID"] = request_id
    return response


@app.middleware("http")
async def add_security_headers(request: Request, call_next: typing.Any) -> typing.Any:
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
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )

    return response


@app.middleware("http")
async def add_process_time_header(
    request: Request, call_next: typing.Any
) -> typing.Any:
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
async def root() -> dict[str, typing.Any]:
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
async def health_check() -> dict[str, typing.Any]:
    """
    健康检查端点

    用于容器健康检查和负载均衡器探测。
    """
    return {"status": "healthy", "message": "XieHe医疗影像诊断系统运行正常"}


@app.get("/info", tags=["Info"])
async def app_info() -> dict[str, typing.Any]:
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


# 如果直接运行此文件，启动开发服务器
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8080,
        reload=True,
        log_level="info",
    )
