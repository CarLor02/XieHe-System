"""
统计与配置接口

GET /api/v1/stats   — 汇总统计
GET /api/v1/config  — 当前配置（只读）
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from config import settings
from database import get_db
from models import ScanFile

router = APIRouter()


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
    """返回当前服务配置（只读，敏感字段脱敏）"""
    return {
        "watch_path": settings.WATCH_PATH,
        "scan_interval_seconds": settings.SCAN_INTERVAL,
        "month_folder_pattern": settings.MONTH_FOLDER_PATTERN,
        "primary_extensions": settings.PRIMARY_EXTENSIONS,
        "db_path": settings.DB_PATH,
        "api_key_set": bool(settings.API_KEY),
    }
