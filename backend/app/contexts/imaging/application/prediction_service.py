"""影像 AI 测量用例。"""

from app.contexts.imaging.application.errors import ImageNotReadyError
from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageFileNotFoundError,
    JsonObject,
)

from .image_status import READY_FILE_STATUSES
from .ports import AiMeasurementGateway
from .visibility_service import ImageVisibilityApplicationService


class ImagePredictionService:
    def __init__(
        self,
        visibility: ImageVisibilityApplicationService,
        gateway: AiMeasurementGateway,
    ) -> None:
        self._visibility = visibility
        self._gateway = gateway

    async def predict(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
    ) -> JsonObject:
        image = self._visibility.get_visible_image(image_file_id, actor)
        if image is None:
            raise ImageFileNotFoundError
        if image.status not in READY_FILE_STATUSES:
            raise ImageNotReadyError("影像文件尚未完成上传")
        return await self._gateway.predict(image)
