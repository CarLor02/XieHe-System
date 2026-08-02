"""影像 AI 测量接口。"""

from typing import cast

from fastapi import APIRouter, Depends

from app.contexts.imaging.application import ImagePredictionService
from app.contexts.imaging.application.errors import (
    AiMeasurementUnavailableError,
    ImageNotReadyError,
)
from app.contexts.imaging.domain import ImageFileNotFoundError
from app.core.access.auth import get_current_active_user
from app.core.system.concurrency import require_ai_object_slot

from ..actor import CurrentUserPayload, image_access_actor
from ..dependencies import get_image_prediction_service
from ..errors import raise_http_error

router = APIRouter()


@router.post("/{file_id}/ai/predict", summary="使用对象存储影像执行AI测量")
async def run_image_file_ai_predict(
    file_id: int,
    current_user: CurrentUserPayload = Depends(get_current_active_user),
    service: ImagePredictionService = Depends(get_image_prediction_service),
    _slot: None = Depends(require_ai_object_slot),
) -> dict[str, object]:
    try:
        result = await service.predict(file_id, image_access_actor(current_user))
        return cast(dict[str, object], result)
    except (
        ImageFileNotFoundError,
        ImageNotReadyError,
        AiMeasurementUnavailableError,
    ) as exc:
        raise_http_error(exc)
