"""影像标注保存与审计 HTTP 接口。"""

from __future__ import annotations

from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
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
from app.core.system.response import paginated_response, success_response

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_annotation_service, get_imaging_query_service
from ..schemas import (
    AnnotationBatchRequest,
    AnnotationSaveResponse,
    SaveAnnotationRequest,
)

router = APIRouter()


@router.post("/annotations/batch", summary="批量获取影像标注")
def get_annotation_batch(
    request: AnnotationBatchRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    items = service.get_annotation_batch(
        image_file_ids=request.ids,
        actor=image_access_actor(current_user),
    )
    returned_ids = {item.id for item in items}
    if returned_ids != set(request.ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        )
    return success_response(
        data={"items": [asdict(item) for item in items]},
        message="标注批量查询成功",
    )


@router.get("/{file_id}/annotation-history", summary="查询影像标注历史")
def list_annotation_history(
    file_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    item_kind: str | None = Query(None),
    item_id: str | None = Query(None),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    result = service.list_history(
        image_file_id=file_id,
        actor=image_access_actor(current_user),
        page=page,
        page_size=page_size,
        item_kind=item_kind,
        item_id=item_id,
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        )
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
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
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagingQueryService = Depends(get_imaging_query_service),
) -> dict[str, object]:
    result = service.get_history_version(
        image_file_id=file_id,
        version=version,
        actor=image_access_actor(current_user),
    )
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="标注版本不存在"
        )
    return success_response(data=asdict(result), message="标注版本查询成功")


@router.put("/{file_id}/annotation", summary="版本化保存影像标注")
def save_annotation(
    file_id: int,
    request: SaveAnnotationRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: AnnotationApplicationService = Depends(get_annotation_service),
) -> dict[str, object]:
    reason = (
        AnnotationMutationReason.SAVE
        if has_annotation_content(request.annotation)
        else AnnotationMutationReason.CLEAR_ALL
    )
    try:
        result = service.save_visible_image(
            image_file_id=file_id,
            actor=image_access_actor(current_user),
            expected_version=request.expected_version,
            annotation=request.annotation,
            source=AnnotationSource.MANUAL,
            reason=reason,
        )
    except ImageFileNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="影像文件不存在"
        ) from exc
    except AnnotationVersionConflictError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "标注已被其他操作更新，请刷新影像后重试",
                "current_version": exc.current_version,
            },
        ) from exc
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
