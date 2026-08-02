"""单文件上传持久化端口。"""

from __future__ import annotations

from typing import Protocol

from app.contexts.imaging.application.dto import PageResult, UploadRecord
from app.models.image_file import ImageFile


class UploadRepository(Protocol):
    def add(self, image: ImageFile) -> None: ...

    def get_active(self, image_file_id: int) -> ImageFile | None: ...

    def get_owned(self, image_file_id: int, owner_id: int) -> ImageFile | None: ...

    def list_records(
        self,
        *,
        owner_id: int,
        page: int,
        page_size: int,
        patient_id: int | None,
    ) -> PageResult[UploadRecord]: ...

    def flush(self) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def refresh(self, image: ImageFile) -> None: ...
