"""影像只读查询端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import (
    AnnotationBatchItem,
    ImageDetail,
    ImageListFilters,
    ImageSummary,
    PageResult,
)
from app.contexts.imaging.domain import ImageAccessScope


class ImageQueryRepository(Protocol):
    def list_images(
        self,
        *,
        scope: ImageAccessScope,
        page: int,
        page_size: int,
        filters: ImageListFilters,
    ) -> PageResult[ImageSummary]: ...

    def get_detail(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
    ) -> ImageDetail | None: ...

    def list_navigation_ids(self, scope: ImageAccessScope) -> list[int]: ...

    def get_annotation_batch(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
    ) -> list[AnnotationBatchItem]: ...
