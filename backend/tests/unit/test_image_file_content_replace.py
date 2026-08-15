from datetime import datetime
from typing import Any

import pytest

from app.contexts.access_control.infrastructure.persistence.models import User
from app.contexts.imaging.application import ImageFileCommandService
from app.contexts.imaging.application.dto import (
    ImageContentReplacement,
    ImageDetail,
    ImageSummary,
    ObjectWriteResult,
)
from app.contexts.imaging.domain import (
    ImageAccessActor,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
)
from app.contexts.imaging.infrastructure.persistence import ImageFile
from app.contexts.teams.infrastructure.persistence.models import Team


def make_image() -> ImageFile:
    # Register relationship targets before directly constructing an ORM image in isolation.
    _ = (User, Team)
    return ImageFile(
        id=301,
        file_uuid="file-301",
        original_filename="original.png",
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_bucket="medical-image-files",
        object_key="file-301/original.png",
        storage_etag="old-etag",
        file_size=128,
        file_hash="old-hash",
        thumbnail_path="file-301/thumb.png",
        uploaded_by=31,
        patient_id=310,
        description="正位X光片",
        annotation={"measurements": [{"id": "m1"}]},
        annotation_version=1,
        has_annotation=True,
        status=ImageFileStatusEnum.PROCESSED,
        upload_progress=100,
        created_at=datetime(2026, 6, 10, 9),
        uploaded_at=datetime(2026, 6, 10, 10),
    )


def image_detail(image: ImageFile) -> ImageDetail:
    return ImageDetail(
        summary=ImageSummary(
            id=image.id,
            file_uuid=str(image.file_uuid),
            original_filename=str(image.original_filename),
            file_type=image.file_type.value,
            mime_type=image.mime_type,
            file_size=image.file_size,
            storage_bucket=str(image.storage_bucket),
            object_key=str(image.object_key),
            storage_etag=image.storage_etag,
            thumbnail_path=image.thumbnail_path,
            uploaded_by=image.uploaded_by,
            uploader_name="替换用户",
            patient_id=image.patient_id,
            patient_name="替换患者",
            patient_identifier="P301",
            team_ids=[],
            team_names=[],
            study_date=image.study_date,
            description=image.description,
            status=image.status.value,
            upload_progress=int(image.upload_progress or 0),
            created_at=image.created_at,
            uploaded_at=image.uploaded_at,
            has_annotation=bool(image.has_annotation),
        ),
        patient_gender="FEMALE",
        patient_age=35,
        annotation=image.annotation,
        annotation_version=int(image.annotation_version or 0),
        annotation_created_at=image.annotation_created_at,
        annotation_created_by=image.annotation_created_by,
        annotation_updated_at=image.annotation_updated_at,
        annotation_updated_by=image.annotation_updated_by,
    )


class FakeRepository:
    def __init__(self, image: ImageFile) -> None:
        self.image = image
        self.committed = False
        self.rolled_back = False

    def get_active(
        self,
        image_file_id: int,
        *,
        for_update: bool = False,
    ) -> ImageFile | None:
        return self.image if image_file_id == self.image.id else None

    def get_detail(self, image: ImageFile) -> ImageDetail:
        return image_detail(image)

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True

    def refresh(self, image: ImageFile) -> None:
        self.image = image


class FakeVisibility:
    def __init__(self, image: ImageFile) -> None:
        self.image = image

    def get_visible_image(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
    ) -> ImageFile | None:
        return self.image if image_file_id == self.image.id else None


class FakeAnnotationService:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def save_locked_image(self, **kwargs: Any) -> None:
        self.calls.append(kwargs)
        image = kwargs["image"]
        image.annotation = {
            "schemaVersion": 1,
            "measurements": [],
            "pointBindings": {"syncGroups": []},
            "vertebraeLayer": [],
        }
        image.annotation_version = 2
        image.has_annotation = False
        image.status = ImageFileStatusEnum.UPLOADED


class FakeStorage:
    def __init__(self) -> None:
        self.put_calls: list[dict[str, object]] = []

    async def put_object(self, **kwargs: Any) -> ObjectWriteResult:
        self.put_calls.append(kwargs)
        return ObjectWriteResult(etag="new-etag")


class FakeThumbnailSchedulingService:
    def __init__(self) -> None:
        self.prepared: list[ImageFile] = []
        self.published: list[object] = []

    def prepare(self, image: ImageFile) -> object:
        self.prepared.append(image)
        return object()

    async def publish_after_commit(self, event: object) -> bool:
        self.published.append(event)
        return True


@pytest.mark.asyncio
async def test_replace_image_content_keeps_id_and_clears_annotations() -> None:
    uploaded_bytes = b"edited-image"
    image = make_image()
    repository = FakeRepository(image)
    annotation = FakeAnnotationService()
    storage = FakeStorage()
    thumbnails = FakeThumbnailSchedulingService()
    service = ImageFileCommandService(
        repository,
        FakeVisibility(image),
        annotation,
        storage,
        thumbnails,  # type: ignore[arg-type]
    )

    result = await service.replace_content(
        301,
        ImageAccessActor(user_id=31),
        ImageContentReplacement(
            filename="edited.png",
            content_type="image/png",
            content=uploaded_bytes,
            description="侧位X光片",
            team_ids=None,
        ),
    )

    detail = result.image
    assert detail.summary.id == 301
    assert detail.summary.object_key == "file-301/original.png"
    assert detail.summary.file_size == len(uploaded_bytes)
    assert detail.summary.storage_etag == "new-etag"
    # Legacy filesystem metadata is retained but no longer drives card previews.
    assert detail.summary.thumbnail_path == "file-301/thumb.png"
    assert detail.summary.description == "侧位X光片"
    assert detail.annotation == {
        "schemaVersion": 1,
        "measurements": [],
        "pointBindings": {"syncGroups": []},
        "vertebraeLayer": [],
    }
    assert detail.annotation_version == 2
    assert detail.summary.status == "UPLOADED"
    assert storage.put_calls == [
        {
            "bucket": "medical-image-files",
            "object_key": "file-301/original.png",
            "data": uploaded_bytes,
            "content_type": "image/png",
        }
    ]
    assert image.id == 301
    assert image.file_hash is None
    assert image.thumbnail_path == "file-301/thumb.png"
    assert annotation.calls[0]["reason"].value == "CONTENT_REPLACEMENT"
    assert annotation.calls[0]["force_revision"] is True
    assert repository.committed
    assert thumbnails.prepared == [image]
    assert len(thumbnails.published) == 1
