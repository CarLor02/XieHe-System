from datetime import datetime

from app.api.v1.endpoints.imaging.handlers.files import (
    _image_file_related_metadata,
    _image_file_response,
)
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.patient import GenderEnum


def make_image_file() -> ImageFile:
    return ImageFile(
        id=1,
        file_uuid="file-uuid",
        original_filename="xray.png",
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        file_size=1024,
        storage_bucket="medical-image-files",
        object_key="objects/xray.png",
        storage_etag=None,
        thumbnail_path=None,
        uploaded_by=7,
        patient_id=3,
        study_date=None,
        description="侧位X光片",
        annotation=None,
        status=ImageFileStatusEnum.UPLOADED,
        upload_progress=100,
        created_at=datetime(2026, 6, 1, 13, 25),
        uploaded_at=None,
    )


def test_image_file_response_includes_patient_and_real_uploader_names() -> None:
    response = _image_file_response(
        make_image_file(),
        uploader_name="王医生",
        patient_name="张三",
        patient_identifier="P2026001",
        patient_gender="MALE",
        patient_age=41,
    )

    assert response.uploader_name == "王医生"
    assert response.patient_name == "张三"
    assert response.patient_identifier == "P2026001"
    assert response.patient_gender == "MALE"
    assert response.patient_age == 41


class ScalarQuery:
    def __init__(self, value: object) -> None:
        self.value = value

    def filter(self, *_conditions: object) -> "ScalarQuery":
        return self

    def scalar(self) -> object:
        return self.value


class PatientQuery:
    def filter(self, *_conditions: object) -> "PatientQuery":
        return self

    def first(self) -> tuple[str, str, GenderEnum, int]:
        return ("张三", "P2026001", GenderEnum.MALE, 41)


class RelatedMetadataDb:
    def __init__(self) -> None:
        self.queried_columns: list[str] = []

    def query(self, *columns: object) -> ScalarQuery | PatientQuery:
        column_names = [getattr(column, "key") for column in columns]
        self.queried_columns.extend(column_names)
        if column_names == ["real_name"]:
            return ScalarQuery("王医生")
        return PatientQuery()


def test_related_metadata_queries_patient_summary_and_real_uploader_name() -> None:
    db = RelatedMetadataDb()

    metadata = _image_file_related_metadata(
        db,
        make_image_file(),
    )

    assert metadata.uploader_name == "王医生"
    assert metadata.patient_name == "张三"
    assert metadata.patient_identifier == "P2026001"
    assert metadata.patient_gender == "MALE"
    assert metadata.patient_age == 41
    assert "real_name" in db.queried_columns
    assert "username" not in db.queried_columns
    assert db.queried_columns[-4:] == ["name", "patient_id", "gender", "age"]


def test_related_metadata_is_empty_without_an_assigned_patient() -> None:
    image = make_image_file()
    image.patient_id = None

    metadata = _image_file_related_metadata(RelatedMetadataDb(), image)

    assert metadata.patient_name is None
    assert metadata.patient_identifier is None
    assert metadata.patient_gender is None
    assert metadata.patient_age is None
