"""单文件上传持久化端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import PageResult, UploadRecord
from app.contexts.imaging.domain import ImageFileDraft

from .records import ImageFileRecord


class UploadRepository(Protocol):
    def create(self, draft: ImageFileDraft) -> ImageFileRecord: ...

    def get_active(self, image_file_id: int) -> ImageFileRecord | None: ...

    def get_owned(
        self, image_file_id: int, owner_id: int
    ) -> ImageFileRecord | None: ...

    def list_records(
        self,
        *,
        owner_id: int,
        page: int,
        page_size: int,
        patient_id: int | None,
    ) -> PageResult[UploadRecord]: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def refresh(self, image: ImageFileRecord) -> None: ...
