"""当前标注快照的唯一写入流程。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Mapping

from app.contexts.imaging.application.ports import AnnotationRepository
from app.contexts.imaging.domain import (
    AnnotationMutationReason,
    AnnotationSource,
    AnnotationVersionConflictError,
    ImageFileNotFoundError,
    canonicalize_annotation,
    diff_annotation_items,
    has_annotation_content,
    snapshots_equal,
)
from app.models.image_file import ImageFile, ImageFileStatusEnum


@dataclass(frozen=True)
class AnnotationSaveResult:
    image_file: ImageFile
    changed: bool


class AnnotationApplicationService:
    """协调乐观锁、当前快照和 append-only 审计。"""

    def __init__(self, repository: AnnotationRepository) -> None:
        self._repository = repository

    def save_visible_image(
        self,
        *,
        image_file_id: int,
        current_user: dict[str, Any],
        expected_version: int,
        annotation: Mapping[str, Any] | None,
        source: AnnotationSource = AnnotationSource.MANUAL,
        reason: AnnotationMutationReason = AnnotationMutationReason.SAVE,
    ) -> AnnotationSaveResult:
        image = self._repository.get_visible_for_update(image_file_id, current_user)
        if image is None:
            raise ImageFileNotFoundError
        return self.save_locked_image(
            image=image,
            actor_id=_user_id(current_user),
            expected_version=expected_version,
            annotation=annotation,
            source=source,
            reason=reason,
        )

    def save_locked_image(
        self,
        *,
        image: ImageFile,
        actor_id: int | None,
        annotation: Mapping[str, Any] | None,
        source: AnnotationSource,
        reason: AnnotationMutationReason,
        expected_version: int | None = None,
        force_revision: bool = False,
    ) -> AnnotationSaveResult:
        current_version = int(image.annotation_version or 0)
        if expected_version is not None and expected_version != current_version:
            raise AnnotationVersionConflictError(current_version)

        now = datetime.now()
        snapshot = canonicalize_annotation(annotation, saved_at=now)
        if not force_revision and snapshots_equal(image.annotation, snapshot):
            return AnnotationSaveResult(image_file=image, changed=False)

        next_version = current_version + 1
        changes = diff_annotation_items(image.annotation, snapshot)
        has_content = has_annotation_content(snapshot)

        image.annotation = snapshot
        image.annotation_version = next_version
        image.has_annotation = has_content
        if image.annotation_created_at is None:
            image.annotation_created_at = now
            image.annotation_created_by = actor_id
        image.annotation_updated_at = now
        image.annotation_updated_by = actor_id
        image.updated_at = now
        image.status = (
            ImageFileStatusEnum.PROCESSED
            if has_content
            else ImageFileStatusEnum.UPLOADED
        )

        self._repository.append_revision(
            image_file_id=image.id,
            version=next_version,
            snapshot=snapshot,
            source=source.value,
            reason=reason.value,
            actor_id=actor_id,
            changes=changes,
        )
        self._repository.flush()
        return AnnotationSaveResult(image_file=image, changed=True)


def _user_id(current_user: dict[str, Any]) -> int | None:
    value = current_user.get("id") or current_user.get("user_id")
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None
