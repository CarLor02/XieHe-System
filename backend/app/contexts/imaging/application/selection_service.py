"""影像上传者与可归属团队选择用例。"""

from app.contexts.imaging.application.dto import (
    AssignableTeam,
    ImageUploader,
    PageResult,
)
from app.contexts.imaging.application.errors import ImageAccessDeniedError
from app.contexts.imaging.domain import ImageAccessActor

from .ports import ImageFileRepository
from .visibility_service import ImageVisibilityApplicationService


class ImageSelectionService:
    def __init__(
        self,
        repository: ImageFileRepository,
        visibility: ImageVisibilityApplicationService,
    ) -> None:
        self._repository = repository
        self._visibility = visibility

    def list_uploaders(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        search: str | None,
    ) -> PageResult[ImageUploader]:
        if not self._visibility.can_choose_uploader(actor):
            raise ImageAccessDeniedError("无权查看上传者列表")
        return self._repository.list_uploaders(
            visible_uploader_ids=self._visibility.list_visible_uploader_ids(actor),
            page=page,
            page_size=page_size,
            search=search,
        )

    def list_assignable_teams(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        search: str | None,
    ) -> PageResult[AssignableTeam]:
        return self._repository.list_assignable_teams(
            actor=actor,
            page=page,
            page_size=page_size,
            search=search,
        )
