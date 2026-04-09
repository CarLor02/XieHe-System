"""
文件相关接口

GET  /api/v1/files                    — 文件列表（支持多维筛选）
GET  /api/v1/files/{file_id}          — 单文件详情
GET  /api/v1/files/{file_id}/download — 流式下载原始文件
POST /api/v1/files/{file_id}/mark-synced       — 标记单文件已同步
POST /api/v1/files/batch-mark-synced           — 批量标记已同步
GET  /api/v1/patients                 — 患者文件夹汇总列表
POST /api/v1/scan                     — 手动触发一次扫描
"""

from datetime import datetime
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from database import get_db
from models import (
    BatchMarkSyncedRequest, BatchMarkSyncedResponse,
    FileListResponse, PatientSummary,
    ScanFile, ScanFileResponse, ScanTriggerResponse,
)
from scheduler import run_scan_now

router = APIRouter()


# ── 患者汇总 ──────────────────────────────────────────────────────────────────

@router.get("/patients", response_model=list[PatientSummary])
def list_patients(
    month: Optional[str] = Query(None, description="按月份筛选，如 IMG2602"),
    db: Session = Depends(get_db),
):
    """列出所有患者文件夹及其文件统计"""
    q = db.query(
        ScanFile.month_folder,
        ScanFile.patient_folder,
        func.count(ScanFile.id).label("total_files"),
        func.sum(ScanFile.is_primary.cast(int)).label("primary_files"),
        func.sum(ScanFile.is_synced.cast(int)).label("synced_files"),
    ).filter(ScanFile.is_valid == True)

    if month:
        q = q.filter(ScanFile.month_folder == month)

    rows = q.group_by(ScanFile.month_folder, ScanFile.patient_folder).all()

    result = []
    for row in rows:
        primary = row.primary_files or 0
        synced = row.synced_files or 0
        result.append(PatientSummary(
            month_folder=row.month_folder,
            patient_folder=row.patient_folder,
            total_files=row.total_files,
            primary_files=primary,
            synced_files=synced,
            unsynced_primary=max(0, primary - synced),
        ))
    return result


# ── 文件列表 ──────────────────────────────────────────────────────────────────

@router.get("/files", response_model=FileListResponse)
def list_files(
    month: Optional[str] = Query(None, description="月份文件夹，如 IMG2602"),
    patient_folder: Optional[str] = Query(None, description="患者文件夹名称"),
    is_synced: Optional[bool] = Query(None),
    is_primary: Optional[bool] = Query(None, description="True=仅主影像，False=仅边车文件"),
    is_valid: Optional[bool] = Query(True, description="默认只返回有效文件"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(ScanFile)
    if is_valid is not None:
        q = q.filter(ScanFile.is_valid == is_valid)
    if month:
        q = q.filter(ScanFile.month_folder == month)
    if patient_folder:
        q = q.filter(ScanFile.patient_folder == patient_folder)
    if is_synced is not None:
        q = q.filter(ScanFile.is_synced == is_synced)
    if is_primary is not None:
        q = q.filter(ScanFile.is_primary == is_primary)

    total = q.count()
    items = q.order_by(ScanFile.month_folder, ScanFile.patient_folder, ScanFile.filename) \
             .offset((page - 1) * page_size).limit(page_size).all()

    return FileListResponse(total=total, page=page, page_size=page_size,
                            items=[ScanFileResponse.model_validate(f) for f in items])


# ── 单文件详情 ────────────────────────────────────────────────────────────────

@router.get("/files/{file_id}", response_model=ScanFileResponse)
def get_file(file_id: int, db: Session = Depends(get_db)):
    sf = db.query(ScanFile).filter(ScanFile.id == file_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="文件不存在")
    return ScanFileResponse.model_validate(sf)


# ── 文件读取（pydicom 解析） ───────────────────────────────────────────────────

@router.get("/files/{file_id}/inspect")
def inspect_file(file_id: int, db: Session = Depends(get_db)):
    """
    用 pydicom 读取文件并返回 DICOM 元数据。
    供主服务端在同步前预览文件内容，同时验证文件可读性。
    """
    import logging
    logger = logging.getLogger(__name__)

    sf = db.query(ScanFile).filter(ScanFile.id == file_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="文件不存在")

    path = Path(sf.file_path)
    logger.info(f"[INSPECT] 检查文件 ID={file_id}, path={sf.file_path}")
    logger.info(f"[INSPECT] Path对象: {path}")
    logger.info(f"[INSPECT] exists()={path.exists()}, is_file()={path.is_file()}")

    if not path.exists():
        logger.error(f"[INSPECT] 文件不存在! path={sf.file_path}")
        raise HTTPException(status_code=410, detail=f"文件已从磁盘消失: {sf.file_path}")

    result = {
        "file_id": sf.id,
        "filename": sf.filename,
        "file_size": sf.file_size,
        "file_path": sf.file_path,
        "is_synced": sf.is_synced,
        "synced_at": sf.synced_at.isoformat() if sf.synced_at else None,
        "dicom": None,
        "error": None,
    }

    try:
        import pydicom

        def _decode(raw) -> Optional[str]:
            """
            DICOM 中文字段乱码修复：
            pydicom 未知字符集时按 latin-1 解码，需尝试用 GBK/GB18030 重新解码。
            """
            if raw is None:
                return None
            s = str(raw).strip()
            for enc in ("gbk", "gb18030", "gb2312", "utf-8"):
                try:
                    return s.encode("latin-1").decode(enc)
                except Exception:
                    pass
            return s

        ds = pydicom.dcmread(str(path), stop_before_pixels=True)

        def tag_val(tag, decode=False):
            v = ds.get(tag)
            if v is None:
                return None
            return _decode(v) if decode else str(v).strip()

        result["dicom"] = {
            "PatientID":         tag_val("PatientID"),
            "PatientName":       tag_val("PatientName", decode=True),
            "PatientSex":        tag_val("PatientSex"),
            "PatientBirthDate":  tag_val("PatientBirthDate"),
            "PatientAge":        tag_val("PatientAge"),
            "StudyDate":         tag_val("StudyDate"),
            "StudyTime":         tag_val("StudyTime"),
            "Modality":          tag_val("Modality"),
            "StudyDescription":  tag_val("StudyDescription",  decode=True),
            "SeriesDescription": tag_val("SeriesDescription", decode=True),
            "StudyInstanceUID":  tag_val("StudyInstanceUID"),
            "SOPInstanceUID":    tag_val("SOPInstanceUID"),
            "Rows":              tag_val("Rows"),
            "Columns":           tag_val("Columns"),
            "BitsAllocated":     tag_val("BitsAllocated"),
        }
    except ImportError:
        result["error"] = "pydicom 未安装，无法解析 DICOM 元数据"
    except Exception as e:
        result["error"] = f"读取失败: {str(e)}"

    # 返回 JSON 响应，并添加禁止缓存的头
    return JSONResponse(
        content=result,
        headers={
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


# ── 图像预览 ──────────────────────────────────────────────────────────────────

@router.get("/files/{file_id}/preview-image")
def preview_image(file_id: int, db: Session = Depends(get_db)):
    """
    读取 DICOM 像素数据，转换为 PNG 图像流返回，供测试页内联展示。
    自动应用窗宽窗位（若有），归一化到 8-bit 灰度。
    """
    sf = db.query(ScanFile).filter(ScanFile.id == file_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="文件不存在")
    path = Path(sf.file_path)
    if not path.exists():
        raise HTTPException(status_code=410, detail="文件已从磁盘消失")

    try:
        import io
        import numpy as np
        import pydicom
        from PIL import Image

        ds = pydicom.dcmread(str(path))
        arr = ds.pixel_array.astype(np.float32)

        # 多帧取第一帧
        if arr.ndim == 3 and arr.shape[0] > 1:
            arr = arr[0]

        # 应用窗宽窗位
        if hasattr(ds, "WindowCenter") and hasattr(ds, "WindowWidth"):
            wc = ds.WindowCenter
            ww = ds.WindowWidth
            # MultiValue 取第一个
            wc = float(wc[0]) if hasattr(wc, "__iter__") else float(wc)
            ww = float(ww[0]) if hasattr(ww, "__iter__") else float(ww)
            lo, hi = wc - ww / 2, wc + ww / 2
            arr = np.clip(arr, lo, hi)

        # 归一化到 0-255
        mn, mx = arr.min(), arr.max()
        if mx > mn:
            arr = (arr - mn) / (mx - mn) * 255.0
        arr = arr.astype(np.uint8)

        # RGB DICOM 直接用，灰度转 L
        if arr.ndim == 3 and arr.shape[2] == 3:
            img = Image.fromarray(arr, mode="RGB")
        else:
            img = Image.fromarray(arr, mode="L")

        # 限制最长边 1024px，缩小大图
        img.thumbnail((1024, 1024), Image.LANCZOS)

        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return StreamingResponse(buf, media_type="image/png")

    except ImportError as e:
        raise HTTPException(status_code=501, detail=f"依赖未安装: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"图像生成失败: {e}")


# ── 下载 ──────────────────────────────────────────────────────────────────────

@router.get("/files/{file_id}/download")
def download_file(file_id: int, db: Session = Depends(get_db)):
    """流式返回原始文件（主服务端拉取用）"""
    sf = db.query(ScanFile).filter(ScanFile.id == file_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="文件不存在")
    path = Path(sf.file_path)
    if not path.exists():
        raise HTTPException(status_code=410, detail="文件已从磁盘消失")
    return FileResponse(path=str(path), filename=sf.filename,
                        media_type="application/octet-stream")


# ── 标记已同步 ────────────────────────────────────────────────────────────────

@router.post("/files/{file_id}/mark-synced", response_model=ScanFileResponse)
def mark_synced(file_id: int, sync_note: Optional[str] = None, db: Session = Depends(get_db)):
    sf = db.query(ScanFile).filter(ScanFile.id == file_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="文件不存在")
    sf.is_synced = True
    sf.synced_at = datetime.utcnow()
    sf.sync_note = sync_note
    db.commit()
    db.refresh(sf)
    return ScanFileResponse.model_validate(sf)


@router.post("/files/batch-mark-synced", response_model=BatchMarkSyncedResponse)
def batch_mark_synced(body: BatchMarkSyncedRequest, db: Session = Depends(get_db)):
    now = datetime.utcnow()
    updated_ids = []
    for fid in body.file_ids:
        sf = db.query(ScanFile).filter(ScanFile.id == fid).first()
        if sf:
            sf.is_synced = True
            sf.synced_at = now
            sf.sync_note = body.sync_note
            updated_ids.append(fid)
    db.commit()
    return BatchMarkSyncedResponse(updated=len(updated_ids), file_ids=updated_ids)


@router.post("/files/{file_id}/clear-synced", response_model=ScanFileResponse)
def clear_synced(file_id: int, db: Session = Depends(get_db)):
    """清除单文件的同步状态（回退为待同步）"""
    sf = db.query(ScanFile).filter(ScanFile.id == file_id).first()
    if not sf:
        raise HTTPException(status_code=404, detail="文件不存在")
    sf.is_synced = False
    sf.synced_at = None
    sf.sync_note = None
    db.commit()
    db.refresh(sf)
    return ScanFileResponse.model_validate(sf)


@router.post("/files/batch-clear-synced", response_model=BatchMarkSyncedResponse)
def batch_clear_synced(body: BatchMarkSyncedRequest, db: Session = Depends(get_db)):
    """批量清除同步状态"""
    updated_ids = []
    for fid in body.file_ids:
        sf = db.query(ScanFile).filter(ScanFile.id == fid).first()
        if sf:
            sf.is_synced = False
            sf.synced_at = None
            sf.sync_note = None
            updated_ids.append(fid)
    db.commit()
    return BatchMarkSyncedResponse(updated=len(updated_ids), file_ids=updated_ids)


# ── 手动触发扫描 ──────────────────────────────────────────────────────────────

@router.post("/scan", response_model=ScanTriggerResponse)
def trigger_scan():
    """立即执行一次扫描（同步，完成后返回）"""
    try:
        result = run_scan_now()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return ScanTriggerResponse(
        message="扫描完成",
        new_files=result.new_files,
        updated_files=result.updated_files,
        invalid_files=result.invalid_files,
        duration_seconds=result.duration_seconds,
    )
