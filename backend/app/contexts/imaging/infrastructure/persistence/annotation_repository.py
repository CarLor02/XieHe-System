"""SQLAlchemy 标注仓储。"""

from __future__ import annotations

from typing import cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application.ports import ImageFileRecord
from app.contexts.imaging.domain import (
    AnnotationItemChange,
    ImageAccessScope,
    JsonObject,
)

from .access_scope import apply_image_access_scope
from .annotation_models import ImageAnnotationItemEvent, ImageAnnotationRevision
from .image_file_models import ImageFile


class SqlAlchemyAnnotationRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def get_for_update(self, image_file_id: int) -> ImageFileRecord | None:
        return cast(
            ImageFileRecord | None,
            self._session.query(ImageFile)
            .filter(
                ImageFile.id == image_file_id,
                ImageFile.is_deleted.is_(False),
            )
            .populate_existing()
            .with_for_update()
            .first(),
        )

    def get_visible_for_update(
        self,
        image_file_id: int,
        scope: ImageAccessScope,
    ) -> ImageFileRecord | None:
        query = self._session.query(ImageFile).filter(
            ImageFile.id == image_file_id,
            ImageFile.is_deleted.is_(False),
        )
        return cast(
            ImageFileRecord | None,
            apply_image_access_scope(query, scope).with_for_update().first(),
        )

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
