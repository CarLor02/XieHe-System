"""当前标注快照的唯一写入流程。"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Mapping, cast

from app.contexts.imaging.application.ports import (
    AnnotationRepository,
    ImageAccessScopeResolver,
    ImageFileRecord,
)
from app.contexts.imaging.domain import (
    AnnotationMutationReason,
    AnnotationSource,
    AnnotationVersionConflictError,
    ImageAccessActor,
    ImageFileNotFoundError,
    ImageFileStatusEnum,
    JsonObject,
    JsonValue,
    canonicalize_annotation,
    diff_annotation_items,
    has_annotation_content,
    snapshots_equal,
)


@dataclass(frozen=True)
class AnnotationSaveResult:
    image_file: ImageFileRecord
    changed: bool


class AnnotationApplicationService:
    """协调乐观锁、当前快照和 append-only 审计。"""

    def __init__(
        self,
        repository: AnnotationRepository,
        visibility: ImageAccessScopeResolver,
    ) -> None:
        self._repository = repository
        self._visibility = visibility

    def save_visible_image(
        self,
        *,
        image_file_id: int,
        actor: ImageAccessActor,
        expected_version: int,
        annotation: Mapping[str, JsonValue] | None,
        source: AnnotationSource = AnnotationSource.MANUAL,
        reason: AnnotationMutationReason = AnnotationMutationReason.SAVE,
    ) -> AnnotationSaveResult:
        try:
            image = self._repository.get_visible_for_update(
                image_file_id,
                self._visibility.resolve_scope(actor),
            )
            if image is None:
                raise ImageFileNotFoundError
            result = self.save_locked_image(
                image=image,
                actor_id=actor.user_id,
                expected_version=expected_version,
                annotation=annotation,
                source=source,
                reason=reason,
            )
            self._repository.commit()
            return result
        except Exception:
            self._repository.rollback()
            raise

    def save_locked_image(
        self,
        *,
        image: ImageFileRecord,
        actor_id: int | None,
        annotation: Mapping[str, JsonValue] | None,
        source: AnnotationSource,
        reason: AnnotationMutationReason,
        expected_version: int | None = None,
        force_revision: bool = False,
    ) -> AnnotationSaveResult:
        current_version = int(image.annotation_version or 0)
        if expected_version is not None and expected_version != current_version:
            raise AnnotationVersionConflictError(current_version)

        now = datetime.now()
        snapshot = cast(JsonObject, canonicalize_annotation(annotation, saved_at=now))
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
