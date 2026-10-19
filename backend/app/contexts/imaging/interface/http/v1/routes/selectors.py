"""影像上传者和可归属团队选择接口。"""

from dataclasses import asdict

from fastapi import APIRouter, Depends

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.imaging.application import ImageSelectionService
from app.contexts.imaging.application.errors import ImageAccessDeniedError
from app.core.system.response import ApiResponse, PaginatedData, paginated_response

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_image_selection_service
from ..errors import raise_http_error
from ..schemas.query_results import AssignableTeamResult, ImageUploaderResult
from ..schemas.selectors_requests import (
    RequestListAssignableImageTeams,
    RequestListVisibleImageUploaders,
)

router = APIRouter()


@router.post(
    "/uploaders",
    summary="获取当前可见影像上传者",
    response_model=ApiResponse[PaginatedData[ImageUploaderResult]],
    operation_id="list_visible_image_uploaders",
)
def list_visible_image_uploaders(
    request: RequestListVisibleImageUploaders,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageSelectionService = Depends(get_image_selection_service),
) -> dict[str, object]:
    try:
        result = service.list_uploaders(
            actor=image_access_actor(current_user),
            page=request.page,
            page_size=request.page_size,
            search=request.search,
        )
    except ImageAccessDeniedError as exc:
        raise_http_error(exc)
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
        page=request.page,
        page_size=request.page_size,
        message="上传者列表查询成功",
    )


@router.post(
    "/assignable-teams",
    summary="获取可设置为影像归属的团队",
    response_model=ApiResponse[PaginatedData[AssignableTeamResult]],
    operation_id="list_assignable_image_teams",
)
def list_assignable_image_teams(
    request: RequestListAssignableImageTeams,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageSelectionService = Depends(get_image_selection_service),
) -> dict[str, object]:
    result = service.list_assignable_teams(
        actor=image_access_actor(current_user),
        page=request.page,
        page_size=request.page_size,
        search=request.search,
    )
    return paginated_response(
        items=[asdict(item) for item in result.items],
        total=result.total,
        page=request.page,
        page_size=request.page_size,
        message="可归属团队列表查询成功",
    )
