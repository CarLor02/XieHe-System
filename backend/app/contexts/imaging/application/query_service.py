"""影像列表、详情和审计查询的应用边界。"""

from __future__ import annotations

from typing import Any

from .ports import ImageQueryRepository


class ImagingQueryService:
    def __init__(self, repository: ImageQueryRepository) -> None:
        self._repository = repository

    def list_images(self, **kwargs: Any) -> tuple[list[dict[str, Any]], int]:
        return self._repository.list_images(**kwargs)

    def get_detail(self, **kwargs: Any) -> dict[str, Any] | None:
        return self._repository.get_detail(**kwargs)

    def list_navigation_ids(self, current_user: dict[str, Any]) -> list[int]:
        return self._repository.list_navigation_ids(current_user)

    def get_annotation_batch(self, **kwargs: Any) -> list[dict[str, Any]]:
        return self._repository.get_annotation_batch(**kwargs)

    def list_history(self, **kwargs: Any) -> tuple[list[dict[str, Any]], int] | None:
        return self._repository.list_history(**kwargs)

    def get_history_version(self, **kwargs: Any) -> dict[str, Any] | None:
        return self._repository.get_history_version(**kwargs)
