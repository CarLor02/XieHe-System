"""Mounted report-context routes."""

from fastapi import APIRouter

from . import generation

router = APIRouter()
router.include_router(
    generation.router,
    prefix="/report-generation",
    tags=["报告生成"],
)
