"""影像上传者和可归属团队选择接口。"""

from dataclasses import asdict

from fastapi import APIRouter, Depends, Query

from app.contexts.imaging.application import ImageSelectionService
from app.contexts.imaging.application.errors import ImageAccessDeniedError
from app.core.access.auth import get_current_active_user
from app.core.system.response import paginated_response

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_image_selection_service
from ..errors import raise_http_error

router = APIRouter()


@router.get("/uploaders", summary="获取当前可见影像上传者")
def list_visible_image_uploaders(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    search: str | None = Query(None),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageSelectionService = Depends(get_image_selection_service),
) -> dict[str, object]:
    try:
        result = service.list_uploaders(
            actor=image_access_actor(current_user),
            page=page,
            page_size=page_size,
            search=search,
        )
    except ImageAccessDeniedError as exc:
        raise_http_error(exc)
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
        page=page,
        page_size=page_size,
        message="上传者列表查询成功",
    )


@router.get("/assignable-teams", summary="获取可设置为影像归属的团队")
def list_assignable_image_teams(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    search: str | None = Query(None),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageSelectionService = Depends(get_image_selection_service),
) -> dict[str, object]:
    result = service.list_assignable_teams(
        actor=image_access_actor(current_user),
        page=page,
        page_size=page_size,
        search=search,
    )
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
        page=page,
        page_size=page_size,
        message="可归属团队列表查询成功",
    )
