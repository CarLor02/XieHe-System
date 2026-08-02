from datetime import datetime
from typing import Any

import pytest

from app.contexts.imaging.application import AnnotationApplicationService
from app.contexts.imaging.domain import (
    AnnotationMutationReason,
    AnnotationSource,
    AnnotationVersionConflictError,
    ImageAccessActor,
    ImageAccessScope,
)
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum


class FakeRepository:
    def __init__(self, image: ImageFile) -> None:
        self.image = image
        self.revisions: list[dict[str, Any]] = []
        self.committed = False
        self.rolled_back = False

    def get_for_update(self, image_file_id: int) -> ImageFile | None:
        return self.image if image_file_id == self.image.id else None

    def get_visible_for_update(
        self, image_file_id: int, scope: ImageAccessScope
    ) -> ImageFile | None:
        return self.image if image_file_id == self.image.id else None

    def append_revision(self, **kwargs: Any) -> None:
        self.revisions.append(kwargs)

    def flush(self) -> None:
        return None

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True


class FakeScopeResolver:
    def resolve_scope(self, actor: ImageAccessActor) -> ImageAccessScope:
        return ImageAccessScope(actor.user_id, actor.unrestricted, frozenset())


def create_service(repository: FakeRepository) -> AnnotationApplicationService:
    return AnnotationApplicationService(repository, FakeScopeResolver())


def create_image() -> ImageFile:
    return ImageFile(
        id=1,
        file_uuid="file-1",
        original_filename="image.png",
        file_type=ImageFileTypeEnum.PNG,
        storage_bucket="images",
        object_key="1.png",
        file_size=10,
        uploaded_by=1,
        status=ImageFileStatusEnum.UPLOADED,
        annotation=None,
        annotation_version=0,
        has_annotation=False,
        created_at=datetime(2026, 8, 2),
    )


def test_save_updates_current_state_and_appends_audit_revision() -> None:
    image = create_image()
    repository = FakeRepository(image)
    service = create_service(repository)

    result = service.save_visible_image(
        image_file_id=1,
        actor=ImageAccessActor(user_id=9),
        expected_version=0,
        annotation={"measurements": [{"id": "m1", "type": "ca"}]},
    )

    assert result.changed
    assert image.annotation_version == 1
    assert image.has_annotation
    assert image.status == ImageFileStatusEnum.PROCESSED
    assert image.annotation_created_by == 9
    assert repository.revisions[0]["version"] == 1
    assert repository.revisions[0]["changes"][0].item_id == "m1"
    assert repository.committed


def test_noop_save_does_not_increment_version() -> None:
    image = create_image()
    image.annotation = {"measurements": [], "savedAt": "old"}
    image.annotation_version = 2
    repository = FakeRepository(image)

    result = create_service(repository).save_locked_image(
        image=image,
        actor_id=1,
        expected_version=2,
        annotation={"measurements": []},
        source=AnnotationSource.MANUAL,
        reason=AnnotationMutationReason.CLEAR_ALL,
    )

    assert not result.changed
    assert image.annotation_version == 2
    assert repository.revisions == []


def test_stale_version_is_rejected_before_overwrite() -> None:
    image = create_image()
    image.annotation_version = 3
    repository = FakeRepository(image)

    with pytest.raises(AnnotationVersionConflictError) as error:
        create_service(repository).save_visible_image(
            image_file_id=1,
            actor=ImageAccessActor(user_id=9),
            expected_version=2,
            annotation={},
        )

    assert error.value.current_version == 3
    assert repository.revisions == []
    assert repository.rolled_back


def test_explicit_clear_keeps_versioned_empty_snapshot() -> None:
    image = create_image()
    image.annotation = {"measurements": [{"id": "m1"}]}
    image.annotation_version = 1
    repository = FakeRepository(image)

    create_service(repository).save_locked_image(
        image=image,
        actor_id=2,
        expected_version=1,
        annotation={},
        source=AnnotationSource.MANUAL,
        reason=AnnotationMutationReason.CLEAR_ALL,
    )

    assert image.annotation_version == 2
    assert image.annotation is not None
    assert image.annotation["measurements"] == []
    assert not image.has_annotation
    assert image.status == ImageFileStatusEnum.UPLOADED
