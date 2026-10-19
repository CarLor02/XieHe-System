"""报告管理 HTTP v1 适配器。"""

from __future__ import annotations

from typing import NoReturn, cast

from fastapi import APIRouter, Depends, HTTPException, status

from app.contexts.access_control.application import AccessPrincipal
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.reports.application import ReportManagementApplicationService
from app.contexts.reports.application.dto import (
    CreateReportCommand,
    ReportListQuery,
    UpdateReportCommand,
)
from app.contexts.reports.domain import (
    ReportNotDeletable,
    ReportNotEditable,
    ReportNotFound,
    ReportPatientNotFound,
)
from app.core.system.logger import LogLevel, logger
from app.core.system.response import (
    ApiResponse,
    PaginatedData,
    paginated_response,
    success_response,
)

from ..dependencies import get_report_management_service
from ..schemas import ReportCreate, ReportResponse
from ..schemas.management_requests import (
    RequestDeleteReport,
    RequestGetReport,
    RequestGetReports,
    RequestUpdateReport,
)

router = APIRouter()


def _actor_id(current_user: AccessPrincipal) -> int | None:
    value = current_user.get("id")
    return int(value) if value is not None else None


def _actor_name(current_user: AccessPrincipal) -> str:
    return str(
        current_user.get("real_name") or current_user.get("username") or "未指定医生"
    )


def _raise_domain_error(exc: Exception) -> NoReturn:
    if isinstance(exc, (ReportNotFound, ReportPatientNotFound)):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)
        ) from exc
    if isinstance(exc, (ReportNotEditable, ReportNotDeletable)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)
        ) from exc
    raise exc


@router.post(
    "/create",
    summary="创建报告",
    response_model=ApiResponse[ReportResponse],
    operation_id="create_report",
)
async def create_report(
    request: ReportCreate,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: ReportManagementApplicationService = Depends(
        get_report_management_service
    ),
) -> dict[str, object]:
    try:
        report = service.create(
            CreateReportCommand(
                patient_id=request.patient_id,
                study_id=request.study_id,
                template_id=request.template_id,
                report_title=request.report_title,
                clinical_history=request.clinical_history,
                examination_technique=request.examination_technique,
                findings=request.findings,
                impression=request.impression,
                recommendations=request.recommendations,
                primary_diagnosis=request.primary_diagnosis,
                secondary_diagnosis=request.secondary_diagnosis,
                priority=request.priority,
            ),
            actor_id=_actor_id(current_user),
            actor_name=_actor_name(current_user),
        )
        logger.emit_event(
            LogLevel.INFO,
            message=f"报告创建成功: {report.report_number} - {report.report_title}",
        )
        return success_response(
            data=ReportResponse(**report.to_dict()).model_dump(),
            message="报告创建成功",
            code=201,
        )
    except (ReportNotFound, ReportPatientNotFound) as exc:
        _raise_domain_error(exc)
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"报告创建失败: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="报告创建过程中发生错误",
        ) from exc


@router.post(
    "/list",
    summary="获取报告列表",
    response_model=ApiResponse[PaginatedData[ReportResponse]],
    operation_id="get_reports",
)
async def get_reports(
    request: RequestGetReports,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: ReportManagementApplicationService = Depends(
        get_report_management_service
    ),
) -> dict[str, object]:
    try:
        result = service.list(
            ReportListQuery(
                page=request.page,
                page_size=request.page_size,
                patient_id=request.patient_id,
                status=request.report_status,
                priority=request.priority,
                search=request.search,
            )
        )
        return paginated_response(
            items=[item.to_dict() for item in result.items],
            total=result.total,
            page=result.page,
            page_size=result.page_size,
            message="报告列表查询成功",
        )
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"获取报告列表失败: {exc}")
        return paginated_response(
            items=[],
            total=0,
            page=request.page,
            page_size=request.page_size,
            message="获取报告列表失败",
        )


@router.post(
    "/get",
    summary="获取报告详情",
    response_model=ApiResponse[ReportResponse],
    operation_id="get_report",
)
async def get_report(
    request: RequestGetReport,
    _: AccessPrincipal = Depends(get_current_active_user),
    service: ReportManagementApplicationService = Depends(
        get_report_management_service
    ),
) -> dict[str, object]:
    try:
        report = service.get(request.report_id)
        return success_response(
            data=ReportResponse(**report.to_dict()).model_dump(),
            message="报告详情查询成功",
        )
    except ReportNotFound as exc:
        _raise_domain_error(exc)
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"获取报告详情失败: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取报告详情过程中发生错误",
        ) from exc


@router.post(
    "/update",
    summary="更新报告",
    response_model=ApiResponse[ReportResponse],
    operation_id="update_report",
)
async def update_report(
    request: RequestUpdateReport,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: ReportManagementApplicationService = Depends(
        get_report_management_service
    ),
) -> dict[str, object]:
    changes = cast(
        dict[str, str | None],
        request.model_dump(exclude_unset=True, exclude={"report_id"}),
    )
    try:
        report = service.update(
            request.report_id,
            UpdateReportCommand(changes=changes),
            actor_id=_actor_id(current_user),
        )
        logger.emit_event(
            LogLevel.INFO,
            message=f"报告更新成功: {report.report_number} - {report.report_title}",
        )
        return success_response(
            data=ReportResponse(**report.to_dict()).model_dump(),
            message="报告更新成功",
        )
    except (ReportNotFound, ReportNotEditable) as exc:
        _raise_domain_error(exc)
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"报告更新失败: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="报告更新过程中发生错误",
        ) from exc


@router.post(
    "/delete",
    summary="删除报告",
    response_model=ApiResponse[None],
    operation_id="delete_report",
)
async def delete_report(
    request: RequestDeleteReport,
    current_user: AccessPrincipal = Depends(get_current_active_user),
    service: ReportManagementApplicationService = Depends(
        get_report_management_service
    ),
) -> dict[str, object]:
    try:
        report_number = service.delete(
            request.report_id,
            actor_id=_actor_id(current_user),
        )
        logger.emit_event(LogLevel.INFO, message=f"报告删除成功: {report_number}")
        return success_response(data=None, message="报告删除成功")
    except (ReportNotFound, ReportNotDeletable) as exc:
        _raise_domain_error(exc)
    except Exception as exc:
        logger.emit_event(LogLevel.ERROR, message=f"报告删除失败: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="报告删除过程中发生错误",
        ) from exc
