"""影像当前状态、版本化保存和审计 HTTP API。"""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.contexts.imaging.application import (
    AnnotationApplicationService,
    ImagingQueryService,
)
from app.contexts.imaging.domain import (
    AnnotationMutationReason,
    AnnotationSource,
    AnnotationVersionConflictError,
    ImageFileNotFoundError,
    has_annotation_content,
)
from app.core.access.auth import get_current_active_user
from app.core.database.session import get_db
from app.core.system.response import paginated_response, success_response
from app.models.image_file import ImageFileStatusEnum, ImageFileTypeEnum

from .dependencies import get_annotation_service, get_imaging_query_service
from .schemas import (
    AnnotationBatchRequest,
    AnnotationSaveResponse,
    SaveAnnotationRequest,
)

router = APIRouter()


def _parse_team_ids(value: str | None) -> list[int]:
    if not value:
        return []
    try:
        return sorted(
            {
                int(item.strip())
                for item in value.split(",")
                if item.strip() and int(item.strip()) > 0
            }
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
) -> ImageFileStatusEnum | None:
    if file_status is not None:
        return file_status
    if (
        legacy_status == "pending"
        or legacy_review_status == "unreviewed"
        or legacy_pending_only is True
    ):
        return ImageFileStatusEnum.UPLOADED
    if legacy_review_status == "reviewed":
        return ImageFileStatusEnum.PROCESSED
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
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, Any]:
    items, total = service.list_images(
        current_user=current_user,
        page=page,
        page_size=page_size,
        filters={
            "file_status": _resolve_file_status(
                file_status,
                status_value,
                review_status,
                pending_only,
            ),
            "file_type": file_type,
            "description": description,
            "start_date": start_date,
            "end_date": end_date,
            "search": search,
            "uploaded_by": uploaded_by,
            "team_ids": _parse_team_ids(team_ids),
        },
    )
    return paginated_response(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        message="影像文件列表查询成功",
    )


@router.get("/navigation", summary="获取查看器影像ID列表")
def list_navigation_ids(
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, Any]:
    return success_response(
        data={"ids": service.list_navigation_ids(current_user)},
        message="影像导航列表查询成功",
    )


@router.post("/annotations/batch", summary="批量获取影像标注")
def get_annotation_batch(
    request: AnnotationBatchRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, Any]:
    items = service.get_annotation_batch(
        image_file_ids=request.ids,
        current_user=current_user,
    )
    returned_ids = {item["id"] for item in items}
    if returned_ids != set(request.ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        )
    return success_response(data={"items": items}, message="标注批量查询成功")


@router.get("/{file_id}/annotation-history", summary="查询影像标注历史")
def list_annotation_history(
    file_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    item_kind: str | None = Query(None),
    item_id: str | None = Query(None),
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, Any]:
    result = service.list_history(
        image_file_id=file_id,
        current_user=current_user,
        page=page,
        page_size=page_size,
        item_kind=item_kind,
        item_id=item_id,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        )
    items, total = result
    return paginated_response(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        message="标注历史查询成功",
    )


@router.get(
    "/{file_id}/annotation-history/{version}",
    summary="查询指定版本的标注快照",
)
def get_annotation_history_version(
    file_id: int,
    version: int,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, Any]:
    result = service.get_history_version(
        image_file_id=file_id,
        version=version,
        current_user=current_user,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="标注版本不存在"
        )
    return success_response(data=result, message="标注版本查询成功")


@router.put("/{file_id}/annotation", summary="版本化保存影像标注")
def save_annotation(
    file_id: int,
    request: SaveAnnotationRequest,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: AnnotationApplicationService = Depends(get_annotation_service),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    reason = (
        AnnotationMutationReason.SAVE
        if has_annotation_content(request.annotation)
        else AnnotationMutationReason.CLEAR_ALL
    )
    try:
        result = service.save_visible_image(
            image_file_id=file_id,
            current_user=current_user,
            expected_version=request.expected_version,
            annotation=request.annotation,
            source=AnnotationSource.MANUAL,
            reason=reason,
        )
        db.commit()
    except ImageFileNotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        ) from exc
    except AnnotationVersionConflictError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "标注已被其他操作更新，请刷新影像后重试",
                "current_version": exc.current_version,
            },
        ) from exc
    except Exception:
        db.rollback()
        raise

    image = result.image_file
    response = AnnotationSaveResponse(
        annotation_version=int(image.annotation_version or 0),
        annotation_updated_at=image.annotation_updated_at,
        annotation_updated_by=image.annotation_updated_by,
        has_annotation=bool(image.has_annotation),
        status=image.status.value,
        changed=result.changed,
    )
    return success_response(data=response.model_dump(), message="标注保存成功")


@router.get("/{file_id}", summary="获取影像文件详情")
def get_image_file_detail(
    file_id: int,
    current_user: dict[str, Any] = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, Any]:
    detail = service.get_detail(
        image_file_id=file_id,
        current_user=current_user,
    )
    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        )
    return success_response(data=detail, message="影像文件详情查询成功")
