"""Mounted patient-context routes."""

from fastapi import APIRouter

from . import management

router = APIRouter()
router.include_router(management.router, prefix="/patients", tags=["患者管理"])
