"""影像文件修改与删除接口。"""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.imaging.application import ImageFileCommandService
from app.contexts.imaging.application.dto import (
    ImageContentReplacement,
    ImageDetail,
    ImageInfoUpdate,
)
from app.contexts.imaging.application.errors import (
    ImageAccessDeniedError,
    InvalidImageOperationError,
    ObjectStorageUnavailableError,
)
from app.contexts.imaging.domain import (
    ImageFileNotFoundError,
    ImageTeamAssignmentDeniedError,
    normalize_team_ids,
)
from app.core.system.response import success_response

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_image_file_command_service
from ..errors import raise_http_error
from ..schemas import (
    BatchUpdateExamTypeRequest,
    ImageFileResponse,
    RenameImageFileRequest,
    UpdateExamTypeRequest,
    UpdateImageInfoRequest,
)

router = APIRouter()


def _parse_team_ids_form(value: str | None) -> list[int] | None:
    if value is None:
        return None
    try:
        payload = json.loads(value)
        if not isinstance(payload, list):
            raise ValueError
        return normalize_team_ids([int(item) for item in payload])
    except (json.JSONDecodeError, TypeError, ValueError) as exc:
        raise InvalidImageOperationError("team_ids 参数格式错误") from exc


def _mutation_payload(result_image: ImageDetail) -> dict[str, object]:
    return ImageFileResponse.from_detail(result_image).model_dump()


@router.patch("/batch/exam-type", summary="批量修改影像检查类型")
def batch_update_exam_type(
    request: BatchUpdateExamTypeRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageFileCommandService = Depends(get_image_file_command_service),
) -> dict[str, object]:
    try:
        result = service.update_exam_types(
            request.ids,
            image_access_actor(current_user),
            request.exam_type,
        )
    except (ImageFileNotFoundError, InvalidImageOperationError) as exc:
        raise_http_error(exc)
    return success_response(
        data={
            "updated_ids": list(result.updated_ids),
            "unchanged_ids": list(result.unchanged_ids),
            "updated_count": len(result.updated_ids),
            "unchanged_count": len(result.unchanged_ids),
            "exam_type": result.exam_type,
        },
        message="影像检查类型批量更新成功",
    )


@router.delete("/{file_id}", summary="删除影像文件")
def delete_image_file(
    file_id: int,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageFileCommandService = Depends(get_image_file_command_service),
) -> dict[str, object]:
    try:
        deleted_id = service.delete(file_id, image_access_actor(current_user))
    except (ImageFileNotFoundError, ImageAccessDeniedError) as exc:
        raise_http_error(exc)
    return success_response(data={"file_id": deleted_id}, message="影像文件已删除")


@router.patch("/{file_id}/content", summary="替换影像文件内容")
async def replace_image_file_content(
    file_id: int,
    file: UploadFile = File(...),
    description: str | None = Form(None),
    team_ids: str | None = Form(None),
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageFileCommandService = Depends(get_image_file_command_service),
) -> dict[str, object]:
    try:
        parsed_team_ids = _parse_team_ids_form(team_ids)
        result = await service.replace_content(
            file_id,
            image_access_actor(current_user),
            ImageContentReplacement(
                filename=file.filename or "",
                content_type=file.content_type or "",
                content=await file.read(),
                description=description,
                team_ids=parsed_team_ids,
            ),
        )
    except (
        ImageFileNotFoundError,
        ImageTeamAssignmentDeniedError,
        InvalidImageOperationError,
        ObjectStorageUnavailableError,
    ) as exc:
        raise_http_error(exc)
    return success_response(
        data=_mutation_payload(result.image),
        message="影像内容替换成功",
    )


@router.patch("/{file_id}/info", summary="修改影像信息")
def update_image_info(
    file_id: int,
    request: UpdateImageInfoRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageFileCommandService = Depends(get_image_file_command_service),
) -> dict[str, object]:
    try:
        result = service.update_info(
            file_id,
            image_access_actor(current_user),
            ImageInfoUpdate(
                description=request.description,
                team_ids=request.team_ids,
            ),
        )
    except (ImageFileNotFoundError, ImageTeamAssignmentDeniedError) as exc:
        raise_http_error(exc)
    payload = _mutation_payload(result.image)
    if result.warning:
        payload["warning"] = result.warning
    return success_response(data=payload, message="影像信息更新成功")


@router.patch("/{file_id}/filename", summary="重命名影像文件")
def rename_image_file(
    file_id: int,
    request: RenameImageFileRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageFileCommandService = Depends(get_image_file_command_service),
) -> dict[str, object]:
    try:
        result = service.rename(
            file_id,
            image_access_actor(current_user),
            request.basename,
        )
    except (ImageFileNotFoundError, InvalidImageOperationError) as exc:
        raise_http_error(exc)
    return success_response(
        data=_mutation_payload(result.image), message="影像重命名成功"
    )


@router.patch("/{file_id}/exam-type", summary="修改影像检查类型")
def update_exam_type(
    file_id: int,
    request: UpdateExamTypeRequest,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImageFileCommandService = Depends(get_image_file_command_service),
) -> dict[str, object]:
    try:
        result = service.update_exam_type(
            file_id,
            image_access_actor(current_user),
            request.description,
        )
    except ImageFileNotFoundError as exc:
        raise_http_error(exc)
    return success_response(
        data=_mutation_payload(result.image),
        message="影像检查类型更新成功",
    )
