"""
文件索引服务入口

职责：
- 启动时初始化数据库并触发首次扫描
- 注册所有 API 路由
- 启动/停止 APScheduler 定时扫描
- 可选 API Key 鉴权（通过 X-API-Key Header）
"""

import logging

import uvicorn
from fastapi import Depends, FastAPI, HTTPException, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader

from config import settings
from database import init_db
from scheduler import start_scheduler, stop_scheduler
from api.files import router as files_router
from api.stats import router as stats_router

# ── 日志 ──────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.FileHandler(settings.LOG_FILE),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# ── 鉴权 ──────────────────────────────────────────────────────────────────────
_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def verify_api_key(api_key: str = Security(_api_key_header)):
    """当 API_KEY 配置不为空时启用鉴权"""
    if not settings.API_KEY:
        return  # 未配置 key，跳过鉴权
    if api_key != settings.API_KEY:
        raise HTTPException(status_code=403, detail="Invalid or missing API key")


# ── FastAPI 应用 ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="文件索引服务",
    description=(
        "部署在设备端，自动扫描并索引本地文件结构。\n"
        "主服务端通过此接口查询文件列表、拉取文件并标记同步状态。"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 路由 ──────────────────────────────────────────────────────────────────────
app.include_router(
    files_router,
    prefix="/api/v1",
    tags=["文件 & 患者"],
    dependencies=[Depends(verify_api_key)],
)
app.include_router(
    stats_router,
    prefix="/api/v1",
    tags=["统计 & 配置"],
    dependencies=[Depends(verify_api_key)],
)


# ── 生命周期 ──────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("=== 文件索引服务启动 ===")
    init_db()
    start_scheduler()


@app.on_event("shutdown")
async def shutdown():
    stop_scheduler()
    logger.info("=== 文件索引服务已停止 ===")


# ── 健康检查（无需鉴权）──────────────────────────────────────────────────────
@app.get("/health", tags=["系统"])
async def health():
    from datetime import datetime
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/", tags=["系统"])
async def root():
    return {
        "service": "文件索引服务",
        "version": "1.0.0",
        "docs": "/docs",
        "watch_path": settings.WATCH_PATH,
        "scan_interval_seconds": settings.SCAN_INTERVAL,
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
    )
