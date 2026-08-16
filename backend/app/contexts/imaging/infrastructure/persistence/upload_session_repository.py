"""SQLAlchemy persistence for durable image upload sessions."""

from __future__ import annotations

from datetime import datetime
from typing import cast

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import ImageUploadSessionDraft
from app.contexts.imaging.application.ports import (
    ImageFileRecord,
    ImageImportItemRecord,
    ImageUploadSessionRecord,
)
from app.contexts.imaging.domain import (
    ACTIVE_UPLOAD_SESSION_STATUSES,
    ImageFileDraft,
    ImageFileStatusEnum,
    ImageImportUploadStatus,
    ImageUploadSessionStatus,
)
from app.contexts.patients.infrastructure.persistence.models import Patient

from .image_file_mapper import image_file_from_draft
from .image_file_models import ImageFile
from .image_import_models import ImageImportItem
from .mysql_lock_errors import commit_with_lock_translation
from .upload_session_models import ImageUploadSession


class SqlAlchemyUploadSessionRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def patient_exists(self, patient_id: int) -> bool:
        return (
            self._session.query(Patient.id).filter(Patient.id == patient_id).first()
            is not None
        )

    def create_replacing_active(
        self, draft: ImageUploadSessionDraft
    ) -> tuple[ImageUploadSessionRecord, list[ImageUploadSessionRecord]]:
        previous: list[ImageUploadSessionRecord] = []
        if draft.batch_item_id is not None:
            item = (
                self._session.query(ImageImportItem)
                .filter(ImageImportItem.id == draft.batch_item_id)
                .with_for_update()
                .first()
            )
            if item is None:
                raise ValueError("批量导入项不存在")
            active_values = [status.value for status in ACTIVE_UPLOAD_SESSION_STATUSES]
            previous = cast(
                list[ImageUploadSessionRecord],
                self._session.query(ImageUploadSession)
                .filter(
                    ImageUploadSession.batch_item_id == draft.batch_item_id,
                    ImageUploadSession.status.in_(active_values),
                )
                .with_for_update()
                .all(),
            )
            for session in previous:
                session.status = ImageUploadSessionStatus.CANCELLED.value
                session.last_error = "已由新的上传会话替代"

        model = ImageUploadSession(
            session_id=draft.session_id,
            source_type=draft.source_type,
            batch_item_id=draft.batch_item_id,
            image_file_id=None,
            status=ImageUploadSessionStatus.INITIALIZING.value,
            file_uuid=draft.file_uuid,
            original_filename=draft.original_filename,
            file_type=draft.file_type,
            mime_type=draft.mime_type,
            expected_size=draft.expected_size,
            expected_hash=draft.expected_hash,
            storage_bucket=draft.storage_bucket,
            object_key=draft.object_key,
            upload_id=None,
            storage_etag=None,
            uploaded_by=draft.uploaded_by,
            patient_id=draft.patient_id,
            description=draft.description,
            team_ids=draft.team_ids,
            expires_at=None,
            completion_lease_expires_at=None,
            last_error=None,
            completed_at=None,
        )
        self._session.add(model)
        self._session.flush()
        return cast(ImageUploadSessionRecord, model), previous

    def get_owned(
        self, session_id: str, owner_id: int, *, for_update: bool = False
    ) -> ImageUploadSessionRecord | None:
        query = self._session.query(ImageUploadSession).filter(
            ImageUploadSession.session_id == session_id,
            ImageUploadSession.uploaded_by == owner_id,
        )
        if for_update:
            query = query.populate_existing().with_for_update()
        return cast(ImageUploadSessionRecord | None, query.first())

    def get_by_id(
        self, session_id: str, *, for_update: bool = False
    ) -> ImageUploadSessionRecord | None:
        query = self._session.query(ImageUploadSession).filter(
            ImageUploadSession.session_id == session_id
        )
        if for_update:
            query = query.populate_existing().with_for_update()
        return cast(ImageUploadSessionRecord | None, query.first())

    def list_stale_sessions(
        self,
        *,
        from_id: int,
        stale_before: datetime,
        limit: int,
    ) -> list[ImageUploadSessionRecord]:
        active_values = [status.value for status in ACTIVE_UPLOAD_SESSION_STATUSES]
        return cast(
            list[ImageUploadSessionRecord],
            self._session.query(ImageUploadSession)
            .filter(
                ImageUploadSession.id >= from_id,
                ImageUploadSession.status.in_(active_values),
                ImageUploadSession.created_at <= stale_before,
                or_(
                    ImageUploadSession.status
                    != ImageUploadSessionStatus.COMPLETING.value,
                    ImageUploadSession.completion_lease_expires_at.is_(None),
                    ImageUploadSession.completion_lease_expires_at <= self.now(),
                ),
            )
            .order_by(ImageUploadSession.id)
            .limit(limit)
            .all(),
        )

    def list_stale_legacy_images(
        self,
        *,
        from_id: int,
        stale_before: datetime,
        limit: int,
    ) -> list[ImageFileRecord]:
        # Compatibility branch for placeholders created before upload sessions.
        return cast(
            list[ImageFileRecord],
            self._session.query(ImageFile)
            .filter(
                ImageFile.id >= from_id,
                ImageFile.is_deleted.is_(False),
                ImageFile.status == ImageFileStatusEnum.UPLOADING,
                ImageFile.created_at <= stale_before,
            )
            .order_by(ImageFile.id)
            .limit(limit)
            .all(),
        )

    def get_batch_item_for_image(
        self, image_file_id: int
    ) -> ImageImportItemRecord | None:
        return cast(
            ImageImportItemRecord | None,
            self._session.query(ImageImportItem)
            .filter(ImageImportItem.image_file_id == image_file_id)
            .first(),
        )

    def create_image(self, draft: ImageFileDraft) -> ImageFileRecord:
        image = image_file_from_draft(draft)
        self._session.add(image)
        self._session.flush()
        return cast(ImageFileRecord, image)

    def attach_completed_batch_item(
        self, session: ImageUploadSessionRecord, image: ImageFileRecord
    ) -> None:
        if session.batch_item_id is None:
            return
        item = (
            self._session.query(ImageImportItem)
            .filter(ImageImportItem.id == session.batch_item_id)
            .with_for_update()
            .first()
        )
        if item is None:
            raise ValueError("批量导入项不存在")
        item.image_file_id = image.id
        item.upload_status = ImageImportUploadStatus.UPLOADED.value
        item.error_message = None
        item.updated_at = self.now()

    def commit(self) -> None:
        commit_with_lock_translation(self._session)

    def rollback(self) -> None:
        self._session.rollback()

    def refresh(self, session: ImageUploadSessionRecord) -> None:
        self._session.refresh(session)

    @staticmethod
    def now() -> datetime:
        return datetime.now()
