"""SQLAlchemy 标注审计历史查询。"""

from __future__ import annotations

from typing import cast

from sqlalchemy.orm import Session

from app.contexts.imaging.application.dto import (
    AnnotationEventItem,
    AnnotationHistoryItem,
    AnnotationHistoryVersion,
    PageResult,
)
from app.contexts.imaging.domain import ImageAccessScope, JsonObject

from .access_scope import apply_image_access_scope
from .annotation_models import ImageAnnotationItemEvent, ImageAnnotationRevision
from .image_file_models import ImageFile


class SqlAlchemyAnnotationHistoryRepository:
    def __init__(self, session: Session) -> None:
        self._session = session

    def _is_visible(self, image_file_id: int, scope: ImageAccessScope) -> bool:
        query = self._session.query(ImageFile.id).filter(
            ImageFile.id == image_file_id,
            ImageFile.is_deleted.is_(False),
        )
        return apply_image_access_scope(query, scope).first() is not None

    def list_history(
        self,
        *,
        image_file_id: int,
        scope: ImageAccessScope,
        page: int,
        page_size: int,
        item_kind: str | None,
        item_id: str | None,
    ) -> PageResult[AnnotationHistoryItem] | None:
        if not self._is_visible(image_file_id, scope):
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
        return PageResult(
            items=[
                AnnotationHistoryItem(
                    version=revision.version,
                    source=revision.source,
                    reason=revision.reason,
                    actor_id=revision.actor_id,
                    created_at=revision.created_at,
                    event_count=len(revision.item_events),
                )
                for revision in revisions
            ],
            total=total,
        )

    def get_history_version(
        self,
        *,
        image_file_id: int,
        version: int,
        scope: ImageAccessScope,
    ) -> AnnotationHistoryVersion | None:
        if not self._is_visible(image_file_id, scope):
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
        return AnnotationHistoryVersion(
            version=revision.version,
            snapshot=cast(JsonObject, revision.snapshot),
            source=revision.source,
            reason=revision.reason,
            actor_id=revision.actor_id,
            created_at=revision.created_at,
            events=[
                AnnotationEventItem(
                    item_kind=event.item_kind,
                    item_id=event.item_id,
                    action=event.action,
                    before_payload=event.before_payload,
                    after_payload=event.after_payload,
                )
                for event in revision.item_events
            ],
        )
