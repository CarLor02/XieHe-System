"""SQLAlchemy 单文件上传持久化。"""

from __future__ import annotations

from typing import cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import PageResult, UploadRecord
from app.contexts.imaging.application.ports import ImageFileRecord
from app.contexts.imaging.domain import ImageFileDraft

from .image_file_mapper import image_file_from_draft
from .image_file_models import ImageFile
from .mysql_lock_errors import commit_with_lock_translation


class SqlAlchemyUploadRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def create(self, draft: ImageFileDraft) -> ImageFileRecord:
        image = image_file_from_draft(draft)
        self._session.add(image)
        self._session.flush()
        return cast(ImageFileRecord, image)

    def get_active(self, image_file_id: int) -> ImageFileRecord | None:
        return cast(
            ImageFileRecord | None,
            self._session.query(ImageFile)
            .filter(
                ImageFile.id == image_file_id,
                ImageFile.is_deleted.is_(False),
            )
            .first(),
        )

    def get_owned(self, image_file_id: int, owner_id: int) -> ImageFileRecord | None:
        return cast(
            ImageFileRecord | None,
            self._session.query(ImageFile)
            .filter(
                ImageFile.id == image_file_id,
                ImageFile.uploaded_by == owner_id,
                ImageFile.is_deleted.is_(False),
            )
            .first(),
        )

    def list_records(
        self,
        *,
        owner_id: int,
        page: int,
        page_size: int,
        patient_id: int | None,
    ) -> PageResult[UploadRecord]:
        query = self._session.query(ImageFile).filter(
            ImageFile.is_deleted.is_(False),
            ImageFile.uploaded_by == owner_id,
        )
        if patient_id is not None:
            query = query.filter(ImageFile.patient_id == patient_id)
        total = query.count()
        images = (
            query.order_by(ImageFile.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return PageResult(
            items=[
                UploadRecord(
                    id=image.id,
                    file_id=image.id,
                    file_uuid=str(image.file_uuid),
                    filename=str(image.original_filename),
                    file_size=image.file_size,
                    file_type=image.file_type.value,
                    mime_type=cast(str | None, image.mime_type),
                    status=image.status.value,
                    patient_id=image.patient_id,
                    uploaded_at=image.uploaded_at,
                    description=image.description,
                )
                for image in images
            ],
            total=total,
        )

    def commit(self) -> None:
        commit_with_lock_translation(self._session)

    def rollback(self) -> None:
        self._session.rollback()

    def refresh(self, image: ImageFileRecord) -> None:
        self._session.refresh(image)
