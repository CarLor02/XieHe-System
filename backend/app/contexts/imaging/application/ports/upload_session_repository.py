"""Persistence port for durable image upload sessions."""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from app.contexts.imaging.application.dto import ImageUploadSessionDraft
from app.contexts.imaging.domain import ImageFileDraft

from .records import ImageFileRecord, ImageImportItemRecord, ImageUploadSessionRecord


class UploadSessionRepository(Protocol):
    def patient_exists(self, patient_id: int) -> bool: ...

    def create_replacing_active(
        self, draft: ImageUploadSessionDraft
    ) -> tuple[ImageUploadSessionRecord, list[ImageUploadSessionRecord]]: ...

    def get_owned(
        self, session_id: str, owner_id: int, *, for_update: bool = False
    ) -> ImageUploadSessionRecord | None: ...

    def get_by_id(
        self, session_id: str, *, for_update: bool = False
    ) -> ImageUploadSessionRecord | None: ...

    def list_stale_sessions(
        self,
        *,
        from_id: int,
        stale_before: datetime,
        limit: int,
    ) -> list[ImageUploadSessionRecord]: ...

    def list_stale_legacy_images(
        self,
        *,
        from_id: int,
        stale_before: datetime,
        limit: int,
    ) -> list[ImageFileRecord]: ...

    def get_batch_item_for_image(
        self, image_file_id: int
    ) -> ImageImportItemRecord | None: ...

    def create_image(self, draft: ImageFileDraft) -> ImageFileRecord: ...

    def attach_completed_batch_item(
        self, session: ImageUploadSessionRecord, image: ImageFileRecord
    ) -> None: ...

    def commit(self) -> None: ...

    def rollback(self) -> None: ...

    def refresh(self, session: ImageUploadSessionRecord) -> None: ...

    def now(self) -> datetime: ...
