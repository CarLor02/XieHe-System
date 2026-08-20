"""SQLAlchemy read adapter for filename-driven dataset exports."""

from __future__ import annotations

from typing import cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import DatasetExportCandidate
from app.contexts.imaging.domain import ImageFileStatusEnum, JsonObject
from app.contexts.patients.infrastructure.persistence.models import Patient

from .image_file_models import ImageFile


class SqlAlchemyDatasetExportRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def find_candidates(
        self,
        *,
        filenames: list[str],
        exam_type: str,
    ) -> list[DatasetExportCandidate]:
        if not filenames:
            return []
        requested = set(filenames)
        rows = (
            self._session.query(
                ImageFile.id,
                ImageFile.original_filename,
                ImageFile.description,
                ImageFile.storage_bucket,
                ImageFile.object_key,
                ImageFile.file_size,
                ImageFile.annotation,
                Patient.patient_id,
            )
            .join(Patient, ImageFile.patient_id == Patient.id)
            .filter(
                ImageFile.original_filename.in_(filenames),
                ImageFile.description == exam_type,
                ImageFile.is_deleted.is_(False),
                Patient.is_deleted.is_(False),
                ImageFile.status.notin_(
                    [ImageFileStatusEnum.UPLOADING, ImageFileStatusEnum.DELETED]
                ),
            )
            .order_by(ImageFile.id.desc())
            .all()
        )
        # MySQL deployments commonly use a case-insensitive collation. Enforce the
        # CLI contract after the indexed IN query so only byte-for-byte names match.
        return [
            DatasetExportCandidate(
                image_file_id=int(image_file_id),
                original_filename=str(original_filename),
                description=str(description) if description is not None else None,
                storage_bucket=str(storage_bucket),
                object_key=str(object_key),
                file_size=int(file_size),
                patient_identifier=(
                    str(patient_identifier) if patient_identifier else None
                ),
                annotation=cast(JsonObject | None, annotation),
            )
            for (
                image_file_id,
                original_filename,
                description,
                storage_bucket,
                object_key,
                file_size,
                annotation,
                patient_identifier,
            ) in rows
            if str(original_filename) in requested
        ]
