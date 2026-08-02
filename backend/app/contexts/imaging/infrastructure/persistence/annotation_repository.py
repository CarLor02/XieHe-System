"""SQLAlchemy 标注仓储。"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.contexts.imaging.domain import (
    AnnotationItemChange,
    ImageAccessScope,
    JsonObject,
)
from app.models.image_file import ImageFile

from .access_scope import apply_image_access_scope
from .models import ImageAnnotationItemEvent, ImageAnnotationRevision


class SqlAlchemyAnnotationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_for_update(self, image_file_id: int) -> ImageFile | None:
        return (
            self._session.query(ImageFile)
            .filter(
                ImageFile.id == image_file_id,
                ImageFile.is_deleted.is_(False),
            )
            .populate_existing()
            .with_for_update()
            .first()
        )

    def get_visible_for_update(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
    ) -> ImageFile | None:
        query = self._session.query(ImageFile).filter(
            ImageFile.id == image_file_id,
            ImageFile.is_deleted.is_(False),
        )
        return apply_image_access_scope(query, scope).with_for_update().first()

    def append_revision(
        self,
        *,
        image_file_id: int,
        version: int,
        snapshot: JsonObject,
        source: str,
        reason: str,
        actor_id: int | None,
        changes: list[AnnotationItemChange],
    ) -> None:
        revision = ImageAnnotationRevision(
            image_file_id=image_file_id,
            version=version,
            snapshot=snapshot,
            source=source,
            reason=reason,
            actor_id=actor_id,
        )
        self._session.add(revision)
        self._session.flush()
        self._session.add_all(
            [
                ImageAnnotationItemEvent(
                    revision_id=revision.id,
                    image_file_id=image_file_id,
                    item_kind=change.kind.value,
                    item_id=change.item_id,
                    action=change.action,
                    before_payload=change.before,
                    after_payload=change.after,
                )
                for change in changes
            ]
        )

    def flush(self) -> None:
        self._session.flush()

    def commit(self) -> None:
        self._session.commit()

    def rollback(self) -> None:
        self._session.rollback()
