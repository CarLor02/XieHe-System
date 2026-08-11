"""影像列表、详情与导航 HTTP 接口。"""

from __future__ import annotations

from dataclasses import asdict
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.imaging.application import ImagingQueryService
from app.contexts.imaging.application.dto import ImageListFilters
from app.contexts.imaging.domain import ImageFileStatusEnum, ImageFileTypeEnum
from app.core.system.response import paginated_response, success_response

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_imaging_query_service
from ..schemas import ImageFileResponse

router = APIRouter()


def _parse_team_ids(value: str | None) -> tuple[int, ...]:
    if not value:
        return ()
    try:
        return tuple(
            sorted(
                {
                    int(item.strip())
                    for item in value.split(",")
                    if item.strip() and int(item.strip()) > 0
                }
            )
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="团队ID格式错误",
        ) from exc


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


@router.get("", summary="获取轻量影像列表")
def list_image_files(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    file_type: ImageFileTypeEnum | None = Query(None),
    file_status: ImageFileStatusEnum | None = Query(None),
    status_value: str | None = Query(None, alias="status"),
    review_status: str | None = Query(None),
    pending_only: bool | None = Query(None),
    description: str | None = Query(None),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    search: str | None = Query(None),
    uploaded_by: int | None = Query(None),
    team_ids: str | None = Query(None),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    result = service.list_images(
        actor=image_access_actor(current_user),
        page=page,
        page_size=page_size,
        filters=ImageListFilters(
            file_status=_resolve_file_status(
                file_status,
                status_value,
                review_status,
                pending_only,
            ),
            file_type=file_type.value if file_type else None,
            description=description,
            start_date=start_date,
            end_date=end_date,
            search=search,
            uploaded_by=uploaded_by,
            team_ids=_parse_team_ids(team_ids),
        ),
    )
    return paginated_response(
        items=[
            ImageFileResponse.from_summary(item).model_dump() for item in result.items
        ],
        total=result.total,
        page=page,
        page_size=page_size,
        message="影像文件列表查询成功",
    )


@router.get("/navigation", summary="获取查看器影像ID列表")
def list_navigation_ids(
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    return success_response(
        data={"ids": service.list_navigation_ids(image_access_actor(current_user))},
        message="影像导航列表查询成功",
    )


@router.get("/patient/{patient_id}", summary="获取患者的影像文件")
def get_patient_images(
    patient_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    result = service.list_images(
        actor=image_access_actor(current_user),
        page=page,
        page_size=page_size,
        filters=ImageListFilters(patient_id=patient_id),
    )
    return paginated_response(
        items=[
            ImageFileResponse.from_summary(item).model_dump() for item in result.items
        ],
        total=result.total,
        page=page,
        page_size=page_size,
        message="患者影像文件查询成功",
    )


@router.get("/stats/summary", summary="获取影像文件统计")
def get_image_stats(
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    stats = service.get_image_stats(image_access_actor(current_user))
    return success_response(data=asdict(stats), message="影像统计查询成功")


@router.get("/{file_id}", summary="获取影像文件详情")
def get_image_file_detail(
    file_id: int,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    detail = service.get_detail(
        image_file_id=file_id,
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
