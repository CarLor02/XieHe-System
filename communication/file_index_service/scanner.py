"""
目录扫描器

扫描 WATCH_PATH 下的三层结构：
  月份文件夹(YYYYMM) → 患者文件夹 → 文件

增量策略：
- 新文件 → INSERT
- 已有文件 → 仅更新 file_size / file_mtime / is_valid（不重置同步状态）
- 上次扫描存在、本次消失的文件 → 标记 is_valid=False
"""

import hashlib
import logging
import re
import time
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from config import settings
from models import ScanFile

logger = logging.getLogger(__name__)


@dataclass
class ScanResult:
    new_files: int = 0
    updated_files: int = 0
    invalid_files: int = 0
    duration_seconds: float = 0.0


def _file_hash(path: Path) -> Optional[str]:
    """计算文件 md5 前 8 位（用于去重校验）"""
    try:
        h = hashlib.md5()
        with open(path, "rb") as f:
            h.update(f.read(65536))  # 只读前 64KB，够用且快
        return h.hexdigest()[:8]
    except Exception:
        return None


def _is_primary(path: Path) -> bool:
    """判断是否为主影像文件（无扩展名 或 .dcm/.dicom 等配置中的扩展名）"""
    ext = path.suffix.lower()
    return ext == "" or ext in settings.primary_extensions


def _parse_scan_index(filename: str) -> Optional[str]:
    """从文件名末尾提取序号，如 '6-1-1-001' → '001'"""
    m = re.search(r"-(\d+)$", Path(filename).stem)
    return m.group(1) if m else None


def _is_month_folder(name: str) -> bool:
    return bool(settings.month_pattern.match(name))


def scan_once(db: Session) -> ScanResult:
    """
    执行一次全量扫描，返回结果摘要。
    线程安全：调用方负责确保同一时刻只有一个扫描在运行。
    """
    t0 = time.time()
    result = ScanResult()
    watch = Path(settings.WATCH_PATH).expanduser().resolve()

    if not watch.exists():
        logger.warning(f"WATCH_PATH 不存在: {watch}")
        return result

    # 记录本次扫描发现的所有路径，用于后续标记消失文件
    seen_paths: set[str] = set()

    for month_dir in sorted(watch.iterdir()):
        if not month_dir.is_dir() or not _is_month_folder(month_dir.name):
            continue
        month_folder = month_dir.name

        for patient_dir in sorted(month_dir.iterdir()):
            if not patient_dir.is_dir() or patient_dir.name.startswith("."):
                continue
            patient_folder = patient_dir.name

            for file_path in sorted(patient_dir.iterdir()):
                if not file_path.is_file() or file_path.name.startswith("."):
                    continue
                if file_path.suffix.lower() in settings.skip_extensions:
                    continue

                abs_path = str(file_path.resolve())
                seen_paths.add(abs_path)

                try:
                    stat = file_path.stat()
                    mtime = datetime.fromtimestamp(stat.st_mtime)
                    size = stat.st_size
                except OSError:
                    continue

                existing: Optional[ScanFile] = (
                    db.query(ScanFile).filter(ScanFile.file_path == abs_path).first()
                )

                if existing is None:
                    # 新文件
                    sf = ScanFile(
                        month_folder=month_folder,
                        patient_folder=patient_folder,
                        filename=file_path.name,
                        file_path=abs_path,
                        file_size=size,
                        file_mtime=mtime,
                        scan_index=_parse_scan_index(file_path.name),
                        file_hash=_file_hash(file_path),
                        is_primary=_is_primary(file_path),
                        extension=file_path.suffix.lower() or None,
                        is_valid=True,
                    )
                    db.add(sf)
                    result.new_files += 1
                    logger.debug(f"新文件: {abs_path}")
                else:
                    # 已有文件：只更新元数据，保留同步状态
                    changed = False
                    if existing.file_size != size or existing.file_mtime != mtime:
                        existing.file_size = size
                        existing.file_mtime = mtime
                        changed = True
                    if not existing.is_valid:
                        existing.is_valid = True
                        changed = True
                    if changed:
                        result.updated_files += 1

    # 标记本次扫描中消失的文件为无效
    all_valid: list[ScanFile] = db.query(ScanFile).filter(ScanFile.is_valid == True).all()
    for sf in all_valid:
        if sf.file_path not in seen_paths:
            sf.is_valid = False
            result.invalid_files += 1
            logger.debug(f"文件消失，标记无效: {sf.file_path}")

    db.commit()
    result.duration_seconds = round(time.time() - t0, 2)
    logger.info(
        f"扫描完成 — 新增: {result.new_files}, 更新: {result.updated_files}, "
        f"失效: {result.invalid_files}, 耗时: {result.duration_seconds}s"
    )
    return result
