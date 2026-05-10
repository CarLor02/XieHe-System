from pathlib import Path

import pytest
from pydantic import ValidationError
from sqlalchemy import JSON

from app.api.v1.endpoints.imaging.schemas.files import (
    ImageFileResponse,
    UpdateAnnotationRequest,
)
from app.models.image_file import ImageFile


ANNOTATION_PAYLOAD = {
    "measurements": [],
    "standardDistance": 10,
    "pointBindings": {"syncGroups": []},
}


def test_image_file_annotation_column_uses_json_type() -> None:
    assert isinstance(ImageFile.__table__.c.annotation.type, JSON)


def test_image_file_annotation_schemas_use_json_objects() -> None:
    request = UpdateAnnotationRequest(annotation=ANNOTATION_PAYLOAD)
    assert request.annotation == ANNOTATION_PAYLOAD

    response = ImageFileResponse(
        id=1,
        file_uuid="file-uuid",
        original_filename="xray.png",
        file_type="PNG",
        mime_type="image/png",
        file_size=10,
        storage_bucket="medical-image-files",
        object_key="xray.png",
        storage_etag=None,
        thumbnail_path=None,
        uploaded_by=1,
        patient_id=None,
        study_date=None,
        description=None,
        annotation=ANNOTATION_PAYLOAD,
        status="UPLOADED",
        upload_progress=100,
        created_at="2026-05-10T00:00:00",
        uploaded_at=None,
    )

    assert response.annotation == ANNOTATION_PAYLOAD


def test_image_file_annotation_schemas_reject_json_strings() -> None:
    with pytest.raises(ValidationError):
        UpdateAnnotationRequest(annotation='{"measurements":[]}')


def test_0003_migration_validates_json_before_altering_column() -> None:
    migration = (
        Path(__file__).resolve().parents[2]
        / "alembic"
        / "versions"
        / "0003_image_file_annotation_json.py"
    )

    source = migration.read_text(encoding="utf-8")

    assert 'revision = "0003_image_file_annotation_json"' in source
    assert 'down_revision = "0002_minio_storage"' in source
    assert "JSON_VALID(annotation)" in source
    assert "RuntimeError" in source
    assert "MODIFY annotation JSON" in source
