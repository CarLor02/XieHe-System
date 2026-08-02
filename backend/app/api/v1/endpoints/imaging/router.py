"""Imaging-domain API router."""

from fastapi import APIRouter

from .handlers import files, models, uploads

router = APIRouter()
router.include_router(uploads.router, prefix="/upload", tags=["文件上传"])
router.include_router(files.router, prefix="/image-files", tags=["影像文件管理"])
router.include_router(models.router, prefix="/models", tags=["模型管理"])
