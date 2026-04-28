"""Imaging-domain API router."""

from fastapi import APIRouter

from .handlers import annotations, diagnosis, files, models, uploads

router = APIRouter()
router.include_router(uploads.router, prefix="/upload", tags=["文件上传"])
router.include_router(annotations.router, prefix="/measurements", tags=["影像标注"])
router.include_router(files.router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(diagnosis.router, prefix="/ai-diagnosis", tags=["AI辅助诊断"])
router.include_router(models.router, prefix="/models", tags=["模型管理"])
