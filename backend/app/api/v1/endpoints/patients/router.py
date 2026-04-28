"""Patient-domain API router."""

from fastapi import APIRouter

from .handlers import management

router = APIRouter()
router.include_router(management.router, prefix="/patients", tags=["患者管理"])
