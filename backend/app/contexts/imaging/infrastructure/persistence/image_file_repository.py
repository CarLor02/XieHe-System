"""SQLAlchemy 影像文件命令和选择器仓储。"""

from __future__ import annotations

from typing import cast

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import (
    AssignableTeam,
    ImageDetail,
    ImageUploader,
    PageResult,
)
from app.contexts.imaging.domain import ImageAccessActor, ImageAccessScope, JsonObject
from app.contexts.patients.infrastructure.persistence.models import Patient
from app.contexts.teams.application import TeamAccessService
from app.contexts.teams.infrastructure import SqlAlchemyTeamAccessRepository
from app.models.image_file import ImageFile
from app.models.user import User

from .access_scope import apply_image_access_scope
from .image_query_repository import image_summary


def _enum_value(value: object) -> str:
    enum_value = getattr(value, "value", value)
    return str(enum_value)


class SqlAlchemyImageFileRepository:
    def __init__(self, session: Session) -> None:
        self._session = session
        self._team_access = TeamAccessService(SqlAlchemyTeamAccessRepository(session))

    def get_active(
        self,
        image_file_id: int,
        *,
        for_update: bool = False,
    ) -> ImageFile | None:
        query = self._session.query(ImageFile).filter(
            ImageFile.id == image_file_id,
            ImageFile.is_deleted.is_(False),
        )
        if for_update:
            query = query.populate_existing().with_for_update()
        return query.first()

    def get_detail(self, image: ImageFile) -> ImageDetail:
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
                uploader_name=uploader_name,
                patient_name=patient.name if patient else None,
                patient_identifier=patient.patient_id if patient else None,
            ),
            patient_gender=(
                _enum_value(patient.gender) if patient and patient.gender else None
            ),
            patient_age=patient.age if patient else None,
            annotation=cast(JsonObject | None, image.annotation),
            annotation_version=int(image.annotation_version or 0),
            annotation_created_at=image.annotation_created_at,
            annotation_created_by=image.annotation_created_by,
            annotation_updated_at=image.annotation_updated_at,
            annotation_updated_by=image.annotation_updated_by,
        )

    def list_uploaders(
        self,
        *,
        visible_uploader_ids: list[int] | None,
        page: int,
        page_size: int,
        search: str | None,
    ) -> PageResult[ImageUploader]:
        query = self._session.query(User).filter(
            User.is_deleted.is_(False),
            User.status == "active",
        )
        if visible_uploader_ids is not None:
            query = query.filter(User.id.in_(visible_uploader_ids))
        if search:
            pattern = f"%{search}%"
            query = query.filter(
                or_(
                    User.real_name.ilike(pattern),
                    User.username.ilike(pattern),
                    User.email.ilike(pattern),
                )
            )
        total = query.count()
        users = (
            query.order_by(User.id.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return PageResult(
            items=[
                ImageUploader(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    real_name=user.real_name,
                    department=user.department.name if user.department else None,
                    position=user.position,
                    title=user.title,
                    is_system_admin=bool(user.is_system_admin),
                    system_admin_level=int(user.system_admin_level or 0),
                )
                for user in users
            ],
            total=total,
        )

    def list_assignable_teams(
        self,
        *,
        actor: ImageAccessActor,
        page: int,
        page_size: int,
        search: str | None,
    ) -> PageResult[AssignableTeam]:
        result = self._team_access.list_assignable(
            actor_id=actor.user_id,
            unrestricted=actor.unrestricted,
            page=page,
            page_size=page_size,
            search=search,
        )
        return PageResult(
            items=[
                AssignableTeam(
                    id=item.id,
                    name=item.name,
                    description=item.description,
                    hospital=item.hospital,
                    department=item.department,
                    creator_name=item.creator_name,
                    member_count=item.member_count,
                    max_members=item.max_members,
                    is_member=item.is_member,
                    my_role=item.my_role,
                    my_status=item.my_status,
                    is_creator=item.is_creator,
                    join_status=None,
                    join_request_id=None,
                    created_at=item.created_at,
                )
                for item in result.items
            ],
            total=result.total,
        )

    def list_visible_by_ids(
        self,
        image_file_ids: list[int],
        scope: ImageAccessScope,
    ) -> dict[int, ImageFile]:
        query = self._session.query(ImageFile).filter(
            ImageFile.id.in_(image_file_ids),
            ImageFile.is_deleted.is_(False),
        )
        return {
            image.id: image for image in apply_image_access_scope(query, scope).all()
        }

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()

    def refresh(self, image: ImageFile) -> None:
        self._session.refresh(image)
