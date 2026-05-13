from __future__ import annotations

from datetime import datetime

import pytest

from app.api.v1.endpoints.imaging.handlers import annotations as annotation_handlers
from app.api.v1.endpoints.imaging.schemas.annotations import (
    MeasurementData,
    Point,
    SaveMeasurementsRequest,
)
from app.models.image import ImageAnnotation
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum


class _FakeTransaction:
    def __init__(self, session: "_FakeSession") -> None:
        self.session = session

    def __enter__(self) -> "_FakeTransaction":
        self.session.begin_count += 1
        return self

    def __exit__(self, exc_type, exc, traceback) -> bool:
        if exc_type is None:
            self.session.commit_count += 1
        else:
            self.session.rollback_count += 1
        return False


class _FakeQuery:
    def __init__(self, result=None) -> None:
        self.result = result
        self.with_for_update_called = False
        self.delete_count = 0

    def filter(self, *args, **kwargs) -> "_FakeQuery":
        return self

    def with_for_update(self) -> "_FakeQuery":
        self.with_for_update_called = True
        return self

    def first(self):
        return self.result

    def delete(self, *args, **kwargs) -> int:
        self.delete_count += 1
        return 3


class _FakeSession:
    def __init__(self) -> None:
        self.image = ImageFile(
            id=501,
            file_uuid="image-501",
            original_filename="image.png",
            file_type=ImageFileTypeEnum.PNG,
            mime_type="image/png",
            storage_bucket="medical-image-files",
            object_key="objects/image.png",
            file_size=1024,
            uploaded_by=7,
            patient_id=70,
            status=ImageFileStatusEnum.UPLOADED,
        )
        self.image_query = _FakeQuery(self.image)
        self.annotation_query = _FakeQuery()
        self.begin_count = 0
        self.commit_count = 0
        self.rollback_count = 0
        self.execute_count = 0
        self.added: list[ImageAnnotation] = []

    def begin(self) -> _FakeTransaction:
        return _FakeTransaction(self)

    def query(self, model):
        if model is ImageFile:
            return self.image_query
        if model is ImageAnnotation:
            return self.annotation_query
        raise AssertionError(f"unexpected query model: {model}")

    def add(self, value: ImageAnnotation) -> None:
        self.added.append(value)

    def commit(self) -> None:
        self.commit_count += 1

    def rollback(self) -> None:
        self.rollback_count += 1

    def execute(self, *args, **kwargs) -> None:
        self.execute_count += 1


def _save_request() -> SaveMeasurementsRequest:
    return SaveMeasurementsRequest(
        imageId="501",
        patientId=70,
        examType="正位X光片",
        savedAt=datetime(2026, 5, 12, 10, 20, 30).isoformat(),
        measurements=[
            MeasurementData(
                id="m1",
                type="长度测量",
                value="12.5mm",
                points=[Point(x=1, y=2), Point(x=3, y=4)],
            ),
            MeasurementData(
                id="m2",
                type="Cobb角",
                value="21°",
                points=[Point(x=5, y=6), Point(x=7, y=8)],
            ),
        ],
    )


@pytest.mark.asyncio
async def test_save_measurements_locks_image_and_commits_one_transaction(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(annotation_handlers.logger, "emit_event", lambda *args, **kwargs: True)
    db = _FakeSession()

    result = await annotation_handlers.save_measurements(
        "501",
        _save_request(),
        current_user={"id": 7},
        db=db,
    )

    assert result["data"]["count"] == 2
    assert db.image_query.with_for_update_called is True
    assert db.begin_count == 1
    assert db.commit_count == 1
    assert db.rollback_count == 0
    assert db.execute_count == 0
    assert db.annotation_query.delete_count == 1
    assert len(db.added) == 2
    assert db.image.status == ImageFileStatusEnum.PROCESSED
