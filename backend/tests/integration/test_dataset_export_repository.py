from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.contexts.access_control.infrastructure.persistence.models import User
from app.contexts.imaging.domain import ImageFileStatusEnum, ImageFileTypeEnum
from app.contexts.imaging.infrastructure.persistence import (
    ImageFile,
    ImageFileTeamVisibility,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyDatasetExportRepository,
)
from app.contexts.patients.infrastructure.persistence.models import (
    GenderEnum,
    Patient,
    PatientStatusEnum,
)
from app.contexts.teams.infrastructure.persistence.models import Team

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
            _image(7, "Target.PNG"),
        ]
    )
    db_session.add(
        Team(
            id=1,
            name="Spine Export Team",
            creator_id=1,
            is_active=True,
        )
    )
    db_session.add(ImageFileTeamVisibility(image_file_id=1, team_id=1))
    db_session.commit()

    repository = SqlAlchemyDatasetExportRepository(db_session)
    candidates = repository.find_candidates(
        filenames=["Target.PNG"],
        exam_type="侧位X光片",
        team_id=None,
    )

    assert [candidate.image_file_id for candidate in candidates] == [7, 1]
    assert candidates[0].patient_identifier == "P-DATASET-1"

    team_ids = repository.find_active_team_ids_by_exact_name("Spine Export Team")
    assert team_ids == [1]
    assert repository.find_active_team_ids_by_exact_name("spine export team") == []

    team_candidates = repository.find_candidates(
        filenames=["Target.PNG"],
        exam_type="侧位X光片",
        team_id=team_ids[0],
    )
    assert [candidate.image_file_id for candidate in team_candidates] == [1]
