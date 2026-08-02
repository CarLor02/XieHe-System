"""标注历史只读查询端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import (
    AnnotationHistoryItem,
    AnnotationHistoryVersion,
    PageResult,
)
from app.contexts.imaging.domain import ImageAccessScope


class AnnotationHistoryRepository(Protocol):
    def list_history(
        self,
        *,
        image_file_id: int,
        scope: ImageAccessScope,
        page: int,
        page_size: int,
        item_kind: str | None,
        item_id: str | None,
    ) -> PageResult[AnnotationHistoryItem] | None: ...

    def get_history_version(
        self,
        *,
        image_file_id: int,
        version: int,
        scope: ImageAccessScope,
    ) -> AnnotationHistoryVersion | None: ...
