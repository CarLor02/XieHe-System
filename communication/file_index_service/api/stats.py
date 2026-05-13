"""
统计与配置接口

GET  /api/v1/stats   — 汇总统计
GET  /api/v1/config  — 当前配置
POST /api/v1/config  — 更新配置（需重启生效）
"""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import ScanFile

router = APIRouter()


class ConfigUpdateRequest(BaseModel):
    watch_path: str | None = None
    scan_interval: int | None = None


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    """返回文件索引的汇总统计信息"""
    total = db.query(ScanFile).count()
    valid = db.query(ScanFile).filter(ScanFile.is_valid == True).count()
    primary = db.query(ScanFile).filter(
        ScanFile.is_primary == True, ScanFile.is_valid == True
    ).count()
    synced = db.query(ScanFile).filter(
        ScanFile.is_synced == True, ScanFile.is_valid == True
    ).count()
    unsynced_primary = db.query(ScanFile).filter(
        ScanFile.is_primary == True,
        ScanFile.is_valid == True,
        ScanFile.is_synced == False,
    ).count()

    # 月份分布
    from sqlalchemy import func
    month_rows = (
        db.query(ScanFile.month_folder, func.count(ScanFile.id))
        .filter(ScanFile.is_valid == True)
        .group_by(ScanFile.month_folder)
        .order_by(ScanFile.month_folder.desc())
        .all()
    )

    return {
        "total_records": total,
        "valid_files": valid,
        "primary_files": primary,
        "synced_files": synced,
        "unsynced_primary_files": unsynced_primary,
        "months": [{"month": r[0], "file_count": r[1]} for r in month_rows],
    }


@router.get("/config")
def get_config():
    """返回当前服务配置"""
    return {
        "watch_path": settings.WATCH_PATH,
        "scan_interval_seconds": settings.SCAN_INTERVAL,
        "primary_extensions": settings.PRIMARY_EXTENSIONS,
        "db_path": settings.DB_PATH,
        "api_key_set": bool(settings.API_KEY),
    }


@router.post("/config")
def update_config(req: ConfigUpdateRequest):
    """
    更新配置（写入 .env 文件，需重启服务生效）
    目前支持：watch_path, scan_interval
    """
    env_file = Path(".env")
    if not env_file.exists():
        raise HTTPException(status_code=500, detail=".env 文件不存在")

    lines = env_file.read_text(encoding="utf-8").splitlines()
    updated = []

    for line in lines:
        stripped = line.strip()
        if req.watch_path is not None and stripped.startswith("WATCH_PATH="):
            updated.append(f"WATCH_PATH={req.watch_path}")
        elif req.scan_interval is not None and stripped.startswith("SCAN_INTERVAL="):
            updated.append(f"SCAN_INTERVAL={req.scan_interval}")
        else:
            updated.append(line)

    env_file.write_text("\n".join(updated) + "\n", encoding="utf-8")

    return {
        "message": "配置已更新，请重启服务生效",
        "updated_fields": {
            k: v for k, v in [
                ("watch_path", req.watch_path),
                ("scan_interval", req.scan_interval),
            ] if v is not None
        }
    }
