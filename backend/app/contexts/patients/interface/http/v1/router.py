"""Mounted patient HTTP v1 routes."""

from fastapi import APIRouter

from .routes import management

router = APIRouter()
router.include_router(management.router, prefix="/patients", tags=["患者管理"])
