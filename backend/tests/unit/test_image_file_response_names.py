from datetime import datetime

from app.contexts.imaging.application.dto import ImageDetail, ImageSummary
from app.contexts.imaging.interface.http.v1.schemas import ImageFileResponse


def make_summary() -> ImageSummary:
    return ImageSummary(
        id=1,
        file_uuid="file-uuid",
        original_filename="xray.png",
        file_type="PNG",
        mime_type="image/png",
        file_size=1024,
        storage_bucket="medical-image-files",
        object_key="objects/xray.png",
        storage_etag=None,
        thumbnail_path=None,
        uploaded_by=7,
        uploader_name="王医生",
        patient_id=3,
        patient_name="张三",
        patient_identifier="P2026001",
        team_ids=[],
        team_names=[],
        study_date=None,
        description="侧位X光片",
        status="UPLOADED",
        upload_progress=100,
        created_at=datetime(2026, 6, 1, 13, 25),
        uploaded_at=None,
        has_annotation=False,
    )


def test_summary_response_includes_patient_and_real_uploader_names() -> None:
    response = ImageFileResponse.from_summary(make_summary())

    assert response.uploader_name == "王医生"
    assert response.patient_name == "张三"
    assert response.patient_identifier == "P2026001"
    assert response.patient_gender is None
    assert response.patient_age is None


def test_detail_response_adds_patient_demographics_and_annotation() -> None:
    response = ImageFileResponse.from_detail(
        ImageDetail(
            summary=make_summary(),
            patient_gender="MALE",
            patient_age=41,
            annotation={"measurements": []},
            annotation_version=2,
            annotation_created_at=None,
            annotation_created_by=None,
            annotation_updated_at=None,
            annotation_updated_by=None,
        )
    )

    assert response.patient_gender == "MALE"
    assert response.patient_age == 41
    assert response.annotation == {"measurements": []}
    assert response.annotation_version == 2
