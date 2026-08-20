from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.contexts.access_control.infrastructure.persistence.models import User
from app.contexts.imaging.domain import ImageFileStatusEnum, ImageFileTypeEnum
from app.contexts.imaging.infrastructure.persistence import ImageFile
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyDatasetExportRepository,
)
from app.contexts.patients.infrastructure.persistence.models import (
    GenderEnum,
    Patient,
    PatientStatusEnum,
)

pytestmark = pytest.mark.database


def _image(
    image_id: int,
    filename: str,
    *,
    description: str = "侧位X光片",
    status: ImageFileStatusEnum = ImageFileStatusEnum.UPLOADED,
    is_deleted: bool = False,
) -> ImageFile:
    return ImageFile(
        id=image_id,
        file_uuid=f"dataset-export-{image_id}",
        original_filename=filename,
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_bucket="medical-image-files",
        object_key=f"dataset-export/{image_id}.png",
        file_size=1024,
        uploaded_by=1,
        patient_id=1,
        description=description,
        annotation={"measurements": []},
        status=status,
        upload_progress=100,
        uploaded_at=datetime(2026, 8, 20),
        is_deleted=is_deleted,
    )


def test_dataset_export_repository_applies_exact_active_lateral_filters(
    db_session: Session,
) -> None:
    db_session.add(
        User(
            id=1,
            username="dataset-exporter",
            email="dataset-exporter@example.com",
            password_hash="hash",
            salt="salt",
            real_name="数据导出员",
            status="active",
        )
    )
    db_session.add(
        Patient(
            id=1,
            patient_id="P-DATASET-1",
            name="测试患者",
            gender=GenderEnum.UNKNOWN,
            status=PatientStatusEnum.ACTIVE,
            is_deleted=False,
        )
    )
    db_session.add_all(
        [
            _image(1, "Target.PNG"),
            _image(2, "target.png"),
            _image(3, "Target.PNG", description="正位X光片"),
            _image(4, "Target.PNG", is_deleted=True),
            _image(5, "Target.PNG", status=ImageFileStatusEnum.UPLOADING),
            _image(6, "Target.PNG", status=ImageFileStatusEnum.DELETED),
        ]
    )
    db_session.commit()

    candidates = SqlAlchemyDatasetExportRepository(db_session).find_candidates(
        filenames=["Target.PNG"],
        exam_type="侧位X光片",
    )

    assert [candidate.image_file_id for candidate in candidates] == [1]
    assert candidates[0].patient_identifier == "P-DATASET-1"
