"""FastAPI adapter for report-text generation."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.reports.application import ReportGenerationApplicationService
from app.contexts.reports.domain import ReportMeasurement, UnsupportedExamType
from app.core.system.logger import LogLevel, logger
from app.core.system.response import success_response

from ..dependencies import get_report_generation_service
from ..schemas import GenerateReportRequest

router = APIRouter()


@router.post("/generate", response_model=dict, summary="生成分析报告")
async def generate_report(
    request: GenerateReportRequest,
    _: dict[str, Any] = Depends(get_current_active_user),
    service: ReportGenerationApplicationService = Depends(
        get_report_generation_service
    ),
) -> dict[str, Any]:
    """Generate an AP or lateral report from supplied measurements."""

    try:
        generated = service.generate(
            exam_type=request.examType,
            measurements=[
                ReportMeasurement(
                    type=measurement.type,
                    value=measurement.value,
                    description=measurement.description,
                )
                for measurement in request.measurements
            ],
        )
        logger.emit_event(
            LogLevel.INFO,
            message=(f"成功生成报告: {request.imageId}, 类型: {request.examType}"),
        )
        return success_response(
            data={
                "report": generated.report,
                "generatedAt": generated.generated_at,
            },
            message="报告生成成功",
        )
    except UnsupportedExamType as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"生成报告失败: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"生成报告失败: {exc}",
        ) from exc
