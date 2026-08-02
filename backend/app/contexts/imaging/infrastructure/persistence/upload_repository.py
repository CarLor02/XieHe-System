"""SQLAlchemy 单文件上传持久化。"""

from __future__ import annotations

from typing import cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import PageResult, UploadRecord
from app.models.image_file import ImageFile


class SqlAlchemyUploadRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def add(self, image: ImageFile) -> None:
        self._session.add(image)

    def get_active(self, image_file_id: int) -> ImageFile | None:
        return (
            self._session.query(ImageFile)
            .filter(
                ImageFile.id == image_file_id,
                ImageFile.is_deleted.is_(False),
            )
            .first()
        )

    def get_owned(self, image_file_id: int, owner_id: int) -> ImageFile | None:
        return (
            self._session.query(ImageFile)
            .filter(
                ImageFile.id == image_file_id,
                ImageFile.uploaded_by == owner_id,
                ImageFile.is_deleted.is_(False),
            )
            .first()
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

    def flush(self) -> None:
        self._session.flush()

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def refresh(self, image: ImageFile) -> None:
        self._session.refresh(image)
