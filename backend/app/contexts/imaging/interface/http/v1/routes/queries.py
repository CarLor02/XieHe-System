"""影像列表、详情与导航 HTTP 接口。"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, status

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.imaging.application import ImagingQueryService
from app.contexts.imaging.application.dto import ImageListFilters
from app.contexts.imaging.domain import ImageFileStatusEnum
from app.core.system.response import (
    ApiResponse,
    PaginatedData,
    paginated_response,
    success_response,
)

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_imaging_query_service
from ..schemas import ImageFileResponse
from ..schemas.queries_requests import (
    RequestGetImageFileDetail,
    RequestGetImageStats,
    RequestGetPatientImages,
    RequestListImageFiles,
    RequestListNavigationIds,
)
from ..schemas.query_results import ImageStatisticsResult
from ..schemas.results import ImageNavigationResult

router = APIRouter()


def _resolve_file_status(
    file_status: ImageFileStatusEnum | None,
    legacy_status: str | None,
    legacy_review_status: str | None,
    legacy_pending_only: bool | None,
) -> str | None:
    if file_status is not None:
        return file_status.value
    if (
        legacy_status == "pending"
        or legacy_review_status == "unreviewed"
        or legacy_pending_only is True
    ):
        return ImageFileStatusEnum.UPLOADED.value
    if legacy_review_status == "reviewed":
        return ImageFileStatusEnum.PROCESSED.value
    return None


@router.post(
    "/list",
    summary="获取轻量影像列表",
    response_model=ApiResponse[PaginatedData[ImageFileResponse]],
    operation_id="list_image_files",
)
def list_image_files(
    request: RequestListImageFiles,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    result = service.list_images(
        actor=image_access_actor(current_user),
        page=request.page,
        page_size=request.page_size,
        filters=ImageListFilters(
            file_status=_resolve_file_status(
                request.file_status,
                request.status_value,
                request.review_status,
                request.pending_only,
            ),
            file_type=request.file_type.value if request.file_type else None,
            description=request.description,
            start_date=request.start_date,
            end_date=request.end_date,
            search=request.search,
            uploaded_by=request.uploaded_by,
            team_ids=tuple(
                sorted({team_id for team_id in request.team_ids if team_id > 0})
            ),
        ),
    )
    return paginated_response(
        items=[
            ImageFileResponse.from_summary(item).model_dump() for item in result.items
        ],
        total=result.total,
        page=request.page,
        page_size=request.page_size,
        message="影像文件列表查询成功",
    )


@router.post(
    "/navigation",
    summary="获取查看器影像ID列表",
    response_model=ApiResponse[ImageNavigationResult],
    operation_id="list_navigation_ids",
)
def list_navigation_ids(
    request: RequestListNavigationIds,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    return success_response(
        data={"ids": service.list_navigation_ids(image_access_actor(current_user))},
        message="影像导航列表查询成功",
    )


@router.post(
    "/patient/list",
    summary="获取患者的影像文件",
    response_model=ApiResponse[PaginatedData[ImageFileResponse]],
    operation_id="get_patient_images",
)
def get_patient_images(
    request: RequestGetPatientImages,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    result = service.list_images(
        actor=image_access_actor(current_user),
        page=request.page,
        page_size=request.page_size,
        filters=ImageListFilters(patient_id=request.patient_id),
    )
    return paginated_response(
        items=[
            ImageFileResponse.from_summary(item).model_dump() for item in result.items
        ],
        total=result.total,
        page=request.page,
        page_size=request.page_size,
        message="患者影像文件查询成功",
    )


@router.post(
    "/stats/summary",
    summary="获取影像文件统计",
    response_model=ApiResponse[ImageStatisticsResult],
    operation_id="get_image_stats",
)
def get_image_stats(
    request: RequestGetImageStats,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    stats = service.get_image_stats(image_access_actor(current_user))
    return success_response(data=asdict(stats), message="影像统计查询成功")


@router.post(
    "/get",
    summary="获取影像文件详情",
    response_model=ApiResponse[ImageFileResponse],
    operation_id="get_image_file_detail",
)
def get_image_file_detail(
    request: RequestGetImageFileDetail,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    detail = service.get_detail(
        image_file_id=request.file_id,
        actor=image_access_actor(current_user),
    )
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        )
    return success_response(
        data=ImageFileResponse.from_detail(detail).model_dump(),
        message="影像文件详情查询成功",
    )
