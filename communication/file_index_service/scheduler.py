"""
定时扫描调度器（APScheduler）

服务启动时自动开始定时扫描，间隔由 SCAN_INTERVAL 配置。
SCAN_INTERVAL=0 时禁用自动扫描，仍可通过 POST /api/v1/scan 手动触发。
"""

import logging
import threading

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from config import settings
from database import SessionLocal
from scanner import scan_once

logger = logging.getLogger(__name__)

# 防止并发扫描
_scan_lock = threading.Lock()
_scheduler: BackgroundScheduler | None = None


def _scan_job():
    """调度器调用的扫描任务，带锁保护"""
    if not _scan_lock.acquire(blocking=False):
        logger.warning("上次扫描尚未完成，跳过本次调度")
        return
    try:
        db = SessionLocal()
        try:
            scan_once(db)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"定时扫描异常: {e}", exc_info=True)
    finally:
        _scan_lock.release()


def run_scan_now() -> None:
    """手动触发扫描（在当前线程同步执行，供 API 调用）"""
    if not _scan_lock.acquire(blocking=False):
        raise RuntimeError("当前已有扫描任务正在运行，请稍后再试")
    try:
        db = SessionLocal()
        try:
            return scan_once(db)
        finally:
            db.close()
    finally:
        _scan_lock.release()


def start_scheduler():
    """FastAPI startup 时调用"""
    global _scheduler

    if settings.SCAN_INTERVAL <= 0:
        logger.info("SCAN_INTERVAL=0，已禁用自动扫描")
        # 仍在启动时执行一次首次扫描
        _scan_job()
        return

    _scheduler = BackgroundScheduler(daemon=True)
    _scheduler.add_job(
        _scan_job,
        trigger=IntervalTrigger(seconds=settings.SCAN_INTERVAL),
        id="file_scan",
        max_instances=1,
        replace_existing=True,
    )
    _scheduler.start()
    logger.info(f"定时扫描已启动，间隔 {settings.SCAN_INTERVAL} 秒")

    # 启动后立即执行一次
    _scan_job()


def stop_scheduler():
    """FastAPI shutdown 时调用"""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("定时扫描已停止")
