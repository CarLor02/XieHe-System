"""Imaging-domain API router."""

from fastapi import APIRouter

from .handlers import models

router = APIRouter()
# 文件、标注和上传接口已迁入 contexts/imaging/interface/http/v1。
router.include_router(models.router, prefix="/models", tags=["模型管理"])
