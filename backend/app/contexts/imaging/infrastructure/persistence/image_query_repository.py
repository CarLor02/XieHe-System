"""SQLAlchemy 影像列表、详情和标注批量查询。"""

from __future__ import annotations

from typing import Any, cast

from sqlalchemy import or_
from sqlalchemy.orm import Query, Session, load_only, selectinload

from app.contexts.access_control.infrastructure.persistence.models import User
from app.contexts.imaging.application.dto import (
    AnnotationBatchItem,
    ImageDetail,
    ImageListFilters,
    ImageSummary,
    PageResult,
)
from app.contexts.imaging.domain import (
    ImageAccessScope,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
    JsonObject,
)
from app.contexts.patients.infrastructure.persistence.models import Patient

from .access_scope import apply_image_access_scope
from .image_file_models import ImageFile, ImageFileTeamVisibility

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


def image_summary(
    image: ImageFile,
    *,
    patient_name: str | None,
    patient_identifier: str | None,
    uploader_name: str | None,
) -> ImageSummary:
    """把 ORM 行转换为稳定的应用层只读模型。"""

    visibilities = sorted(image.team_visibilities, key=lambda item: item.team_id)
    return ImageSummary(
        id=image.id,
        file_uuid=str(image.file_uuid),
        original_filename=str(image.original_filename),
        file_type=image.file_type.value,
        mime_type=cast(str | None, image.mime_type),
        file_size=image.file_size,
        storage_bucket=str(image.storage_bucket),
        object_key=str(image.object_key),
        storage_etag=cast(str | None, image.storage_etag),
        thumbnail_path=cast(str | None, image.thumbnail_path),
        uploaded_by=image.uploaded_by,
        uploader_name=uploader_name,
        patient_id=image.patient_id,
        patient_name=patient_name,
        patient_identifier=patient_identifier,
        team_ids=[item.team_id for item in visibilities],
        team_names=[
            item.team.name
            for item in visibilities
            if item.team is not None and item.team.name
        ],
        study_date=image.study_date,
        description=image.description,
        status=image.status.value,
        upload_progress=int(image.upload_progress or 0),
        created_at=image.created_at,
        uploaded_at=image.uploaded_at,
        has_annotation=bool(image.has_annotation),
    )


class SqlAlchemyImageQueryRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _base_summary_query(self, scope: ImageAccessScope) -> Query[Any]:
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
        return apply_image_access_scope(query, scope)

    def list_images(
        self,
        *,
        scope: ImageAccessScope,
        page: int,
        page_size: int,
        filters: ImageListFilters,
    ) -> PageResult[ImageSummary]:
        query = self._base_summary_query(scope)
        if filters.patient_id is not None:
            query = query.filter(ImageFile.patient_id == filters.patient_id)
        if filters.file_type is not None:
            query = query.filter(
                ImageFile.file_type == ImageFileTypeEnum(filters.file_type)
            )
        if filters.file_status is not None:
            query = query.filter(
                ImageFile.status == ImageFileStatusEnum(filters.file_status)
            )
        else:
            # New uploads are not registered in image_files until verified. Keep
            # this predicate for historical placeholders created by the legacy flow.
            query = query.filter(ImageFile.status != ImageFileStatusEnum.UPLOADING)
        if filters.description:
            query = query.filter(ImageFile.description == filters.description)
        if filters.start_date:
            query = query.filter(ImageFile.created_at >= filters.start_date)
        if filters.end_date:
            query = query.filter(ImageFile.created_at <= filters.end_date)
        if filters.search:
            pattern = f"%{filters.search}%"
            query = query.filter(
                or_(
                    ImageFile.original_filename.ilike(pattern),
                    ImageFile.description.ilike(pattern),
                    Patient.name.ilike(pattern),
                )
            )
        if filters.uploaded_by is not None:
            query = query.filter(ImageFile.uploaded_by == filters.uploaded_by)
        if filters.team_ids:
            team_visibility = (
                self._session.query(ImageFileTeamVisibility.image_file_id)
                .filter(
                    ImageFileTeamVisibility.image_file_id == ImageFile.id,
                    ImageFileTeamVisibility.team_id.in_(filters.team_ids),
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
        return PageResult(
            items=[
                image_summary(
                    image,
                    patient_name=patient_name,
                    patient_identifier=patient_identifier,
                    uploader_name=uploader_name,
                )
                for image, patient_name, patient_identifier, uploader_name in rows
            ],
            total=total,
        )

    def get_detail(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
    ) -> ImageDetail | None:
        image = self._visible_image(image_file_id, scope)
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
        return ImageDetail(
            summary=image_summary(
                image,
                patient_name=patient.name if patient else None,
                patient_identifier=patient.patient_id if patient else None,
                uploader_name=uploader_name,
            ),
            patient_gender=patient.gender if patient else None,
            patient_age=patient.age if patient else None,
            annotation=cast(JsonObject | None, image.annotation),
            annotation_version=int(image.annotation_version or 0),
            annotation_created_at=image.annotation_created_at,
            annotation_created_by=image.annotation_created_by,
            annotation_updated_at=image.annotation_updated_at,
            annotation_updated_by=image.annotation_updated_by,
        )

    def list_navigation_ids(self, scope: ImageAccessScope) -> list[int]:
        query: Query[Any] = self._session.query(ImageFile.id).filter(
            ImageFile.is_deleted.is_(False),
            ImageFile.status != ImageFileStatusEnum.UPLOADING,
        )
        query = apply_image_access_scope(query, scope)
        return [
            image_file_id
            for (image_file_id,) in query.order_by(ImageFile.created_at.desc()).all()
        ]

    def get_annotation_batch(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
    ) -> list[AnnotationBatchItem]:
        query = self._session.query(
            ImageFile.id,
            ImageFile.annotation,
            ImageFile.annotation_version,
        ).filter(
            ImageFile.id.in_(image_file_ids),
            ImageFile.is_deleted.is_(False),
        )
        query = apply_image_access_scope(query, scope)
        return [
            AnnotationBatchItem(
                id=image_file_id,
                annotation=cast(JsonObject | None, annotation),
                annotation_version=int(version or 0),
            )
            for image_file_id, annotation, version in query.all()
        ]

    def _visible_image(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
    ) -> ImageFile | None:
        query = self._session.query(ImageFile).filter(
            ImageFile.id == image_file_id,
            ImageFile.is_deleted.is_(False),
        )
        return apply_image_access_scope(query, scope).first()
