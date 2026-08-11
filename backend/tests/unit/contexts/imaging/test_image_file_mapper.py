from datetime import datetime

from app.contexts.imaging.domain import (
    ImageFileDraft,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
)
from app.contexts.imaging.infrastructure.persistence.image_file_mapper import (
    image_file_from_draft,
)


def test_image_file_draft_maps_all_registration_fields() -> None:
    study_date = datetime(2026, 8, 11, 12, 30)
    draft = ImageFileDraft(
        file_uuid="file-1",
        original_filename="spine.png",
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_bucket="medical-image-files",
        object_key="file-1/spine.png",
        file_size=1024,
        file_hash="abc123",
        uploaded_by=7,
        patient_id=9,
        study_date=study_date,
        description="正位X光片",
    )

    image = image_file_from_draft(draft)

    assert image.file_uuid == "file-1"
    assert image.original_filename == "spine.png"
    assert image.file_type is ImageFileTypeEnum.PNG
    assert image.mime_type == "image/png"
    assert image.storage_bucket == "medical-image-files"
    assert image.object_key == "file-1/spine.png"
    assert image.file_size == 1024
    assert image.file_hash == "abc123"
    assert image.uploaded_by == 7
    assert image.patient_id == 9
    assert image.study_date == study_date
    assert image.description == "正位X光片"
    assert image.status is ImageFileStatusEnum.UPLOADING
    assert image.upload_progress == 0
