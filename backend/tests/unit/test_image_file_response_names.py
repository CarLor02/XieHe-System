from datetime import datetime

from app.api.v1.endpoints.imaging.handlers.files import (
    _image_file_related_names,
    _image_file_response,
)
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum


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
    )

    assert response.uploader_name == "王医生"
    assert response.patient_name == "张三"


class ScalarQuery:
    def __init__(self, value: str) -> None:
        self.value = value

    def filter(self, *_conditions: object) -> "ScalarQuery":
        return self

    def scalar(self) -> str:
        return self.value


class RelatedNameDb:
    def __init__(self) -> None:
        self.queried_columns: list[str] = []

    def query(self, column: object) -> ScalarQuery:
        column_name = getattr(column, "key")
        self.queried_columns.append(column_name)
        values = {
            "real_name": "王医生",
            "name": "张三",
        }
        return ScalarQuery(values[column_name])


def test_related_names_query_user_real_name() -> None:
    db = RelatedNameDb()

    uploader_name, patient_name = _image_file_related_names(db, make_image_file())

    assert uploader_name == "王医生"
    assert patient_name == "张三"
    assert "real_name" in db.queried_columns
    assert "username" not in db.queried_columns
