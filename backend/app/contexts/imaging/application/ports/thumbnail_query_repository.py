"""缩略图访问查询端口。"""

from __future__ import annotations

from typing import Protocol

from .records import ImageFileDerivativeRecord


class ThumbnailQueryRepository(Protocol):
    def list_card_thumbnails(
        self, image_file_ids: list[int]
    ) -> dict[int, ImageFileDerivativeRecord]: ...
