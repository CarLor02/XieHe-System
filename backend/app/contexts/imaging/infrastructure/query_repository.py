"""影像只读模型和标注审计查询。"""

from __future__ import annotations

from datetime import date
from typing import Any

from sqlalchemy import or_
from sqlalchemy.orm import Session, load_only, selectinload

from app.contexts.imaging.infrastructure.models import (
    ImageAnnotationItemEvent,
    ImageAnnotationRevision,
)
from app.models.image_file import (
    ImageFile,
    ImageFileTeamVisibility,
)
from app.models.patient import Patient
from app.models.user import User
from app.services.image_file_visibility import (
    apply_image_visibility_filter,
    get_visible_image_file,
)

_SUMMARY_COLUMNS = (
    ImageFile.id,
    ImageFile.file_uuid,
    ImageFile.original_filename,
    ImageFile.file_type,
    ImageFile.mime_type,
    ImageFile.file_size,
    ImageFile.storage_bucket,
    ImageFile.object_key,
    ImageFile.storage_etag,
    ImageFile.thumbnail_path,
    ImageFile.uploaded_by,
    ImageFile.patient_id,
    ImageFile.study_date,
    ImageFile.description,
    ImageFile.status,
    ImageFile.upload_progress,
    ImageFile.created_at,
    ImageFile.uploaded_at,
    ImageFile.has_annotation,
)


def _summary_dict(
    image: ImageFile,
    *,
    patient_name: str | None,
    patient_identifier: str | None,
    uploader_name: str | None,
) -> dict[str, Any]:
    visibilities = sorted(image.team_visibilities, key=lambda item: item.team_id)
    return {
        "id": image.id,
        "file_uuid": image.file_uuid,
        "original_filename": image.original_filename,
        "file_type": image.file_type.value,
        "mime_type": image.mime_type,
        "file_size": image.file_size,
        "storage_bucket": image.storage_bucket,
        "object_key": image.object_key,
        "storage_etag": image.storage_etag,
        "thumbnail_path": image.thumbnail_path,
        "uploaded_by": image.uploaded_by,
        "uploader_name": uploader_name,
        "patient_id": image.patient_id,
        "patient_name": patient_name,
        "patient_identifier": patient_identifier,
        "team_ids": [item.team_id for item in visibilities],
        "team_names": [
            item.team.name
            for item in visibilities
            if item.team is not None and item.team.name
        ],
        "study_date": image.study_date,
        "description": image.description,
        "status": image.status.value,
        "upload_progress": image.upload_progress,
        "created_at": image.created_at,
        "uploaded_at": image.uploaded_at,
        "has_annotation": bool(image.has_annotation),
    }


class SqlAlchemyImageQueryRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _base_summary_query(self, current_user: dict[str, Any]) -> Any:
        query = (
            self._session.query(
                ImageFile,
                Patient.name.label("patient_name"),
                Patient.patient_id.label("patient_identifier"),
                User.real_name.label("uploader_name"),
            )
            .outerjoin(Patient, ImageFile.patient_id == Patient.id)
            .outerjoin(User, ImageFile.uploaded_by == User.id)
            .options(
                load_only(*_SUMMARY_COLUMNS),
                selectinload(ImageFile.team_visibilities).selectinload(
                    ImageFileTeamVisibility.team
                ),
            )
            .filter(ImageFile.is_deleted.is_(False))
        )
        return apply_image_visibility_filter(query, self._session, current_user)

    def list_images(
        self,
        *,
        current_user: dict[str, Any],
        page: int,
        page_size: int,
        filters: dict[str, Any],
    ) -> tuple[list[dict[str, Any]], int]:
        query = self._base_summary_query(current_user)
        file_type = filters.get("file_type")
        if file_type is not None:
            query = query.filter(ImageFile.file_type == file_type)
        file_status = filters.get("file_status")
        if file_status is not None:
            query = query.filter(ImageFile.status == file_status)
        description = filters.get("description")
        if description:
            query = query.filter(ImageFile.description == description)
        start_date: date | None = filters.get("start_date")
        if start_date:
            query = query.filter(ImageFile.created_at >= start_date)
        end_date: date | None = filters.get("end_date")
        if end_date:
            query = query.filter(ImageFile.created_at <= end_date)
        search = filters.get("search")
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    ImageFile.original_filename.ilike(pattern),
                    ImageFile.description.ilike(pattern),
                    Patient.name.ilike(pattern),
                )
            )
        uploaded_by = filters.get("uploaded_by")
        if uploaded_by is not None:
            query = query.filter(ImageFile.uploaded_by == uploaded_by)
        team_ids = filters.get("team_ids") or []
        if team_ids:
            team_visibility = (
                self._session.query(ImageFileTeamVisibility.image_file_id)
                .filter(
                    ImageFileTeamVisibility.image_file_id == ImageFile.id,
                    ImageFileTeamVisibility.team_id.in_(team_ids),
                )
                .exists()
            )
            query = query.filter(team_visibility)

        total = query.count()
        rows = (
            query.order_by(ImageFile.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return (
            [
                _summary_dict(
                    image,
                    patient_name=patient_name,
                    patient_identifier=patient_identifier,
                    uploader_name=uploader_name,
                )
                for image, patient_name, patient_identifier, uploader_name in rows
            ],
            total,
        )

    def get_detail(
        self,
        image_file_id: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any] | None:
        image = get_visible_image_file(self._session, image_file_id, current_user)
        if image is None:
            return None
        patient = (
            self._session.query(Patient).filter(Patient.id == image.patient_id).first()
            if image.patient_id
            else None
        )
        uploader_name = (
            self._session.query(User.real_name)
            .filter(User.id == image.uploaded_by)
            .scalar()
        )
        data = _summary_dict(
            image,
            patient_name=patient.name if patient else None,
            patient_identifier=patient.patient_id if patient else None,
            uploader_name=uploader_name,
        )
        data.update(
            {
                "patient_gender": patient.gender if patient else None,
                "patient_age": patient.age if patient else None,
                "annotation": image.annotation,
                "annotation_version": int(image.annotation_version or 0),
                "annotation_created_at": image.annotation_created_at,
                "annotation_created_by": image.annotation_created_by,
                "annotation_updated_at": image.annotation_updated_at,
                "annotation_updated_by": image.annotation_updated_by,
            }
        )
        return data

    def list_navigation_ids(self, current_user: dict[str, Any]) -> list[int]:
        query: Any = self._session.query(ImageFile.id).filter(
            ImageFile.is_deleted.is_(False)
        )
        query = apply_image_visibility_filter(query, self._session, current_user)
        return [
            image_file_id
            for (image_file_id,) in query.order_by(ImageFile.created_at.desc()).all()
        ]

    def get_annotation_batch(
        self,
        image_file_ids: list[int],
        current_user: dict[str, Any],
    ) -> list[dict[str, Any]]:
        query = self._session.query(
            ImageFile.id,
            ImageFile.annotation,
            ImageFile.annotation_version,
        ).filter(
            ImageFile.id.in_(image_file_ids),
            ImageFile.is_deleted.is_(False),
        )
        query = apply_image_visibility_filter(query, self._session, current_user)
        return [
            {
                "id": image_file_id,
                "annotation": annotation,
                "annotation_version": int(version or 0),
            }
            for image_file_id, annotation, version in query.all()
        ]

    def _visible(self, image_file_id: int, current_user: dict[str, Any]) -> bool:
        return (
            get_visible_image_file(self._session, image_file_id, current_user)
            is not None
        )

    def list_history(
        self,
        *,
        image_file_id: int,
        current_user: dict[str, Any],
        page: int,
        page_size: int,
        item_kind: str | None,
        item_id: str | None,
    ) -> tuple[list[dict[str, Any]], int] | None:
        if not self._visible(image_file_id, current_user):
            return None
        query = self._session.query(ImageAnnotationRevision).filter(
            ImageAnnotationRevision.image_file_id == image_file_id
        )
        if item_kind or item_id:
            query = query.join(ImageAnnotationItemEvent)
            if item_kind:
                query = query.filter(ImageAnnotationItemEvent.item_kind == item_kind)
            if item_id:
                query = query.filter(ImageAnnotationItemEvent.item_id == item_id)
            query = query.distinct()
        total = query.count()
        revisions = (
            query.order_by(ImageAnnotationRevision.version.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return (
            [
                {
                    "version": revision.version,
                    "source": revision.source,
                    "reason": revision.reason,
                    "actor_id": revision.actor_id,
                    "created_at": revision.created_at,
                    "event_count": len(revision.item_events),
                }
                for revision in revisions
            ],
            total,
        )

    def get_history_version(
        self,
        *,
        image_file_id: int,
        version: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any] | None:
        if not self._visible(image_file_id, current_user):
            return None
        revision = (
            self._session.query(ImageAnnotationRevision)
            .filter(
                ImageAnnotationRevision.image_file_id == image_file_id,
                ImageAnnotationRevision.version == version,
            )
            .first()
        )
        if revision is None:
            return None
        return {
            "version": revision.version,
            "snapshot": revision.snapshot,
            "source": revision.source,
            "reason": revision.reason,
            "actor_id": revision.actor_id,
            "created_at": revision.created_at,
            "events": [
                {
                    "item_kind": event.item_kind,
                    "item_id": event.item_id,
                    "action": event.action,
                    "before_payload": event.before_payload,
                    "after_payload": event.after_payload,
                }
                for event in revision.item_events
            ],
        }
