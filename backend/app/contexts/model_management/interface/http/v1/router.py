"""Mounted model-management routes."""

from fastapi import APIRouter

from .routes import models

router = APIRouter()
router.include_router(models.router, prefix="/models", tags=["模型管理"])
