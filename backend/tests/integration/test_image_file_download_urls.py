from datetime import datetime
from typing import Any, cast

import pytest
from fastapi import Response
from sqlalchemy.orm import Session

from app.contexts.imaging.application import (
    ImageDeliveryService,
    ImageVisibilityApplicationService,
)
from app.contexts.imaging.infrastructure.persistence import (
    SqlAlchemyImageFileRepository,
    SqlAlchemyImageVisibilityRepository,
)
from app.contexts.imaging.interface.http.v1.dependencies import (
    build_imaging_query_service,
)
from app.contexts.imaging.interface.http.v1.routes.delivery import (
    get_image_file_download_url,
    get_image_file_download_urls,
)
from app.contexts.imaging.interface.http.v1.routes.queries import get_image_stats
from app.contexts.imaging.interface.http.v1.schemas import BatchDownloadUrlsRequest
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.patient import GenderEnum, Patient, PatientStatusEnum
from app.models.user import User

pytestmark = pytest.mark.database


def response_data(response: dict[str, object]) -> dict[str, Any]:
    return cast(dict[str, Any], response["data"])


class FakeStorage:
    def __init__(self) -> None:
        self.presigned_calls: list[tuple[str, str, int]] = []

    async def presign_get(
        self,
        *,
        bucket: str,
        object_key: str,
        expires_in: int,
    ) -> str:
        self.presigned_calls.append((bucket, object_key, expires_in))
        return f"/{bucket}/{object_key}?signature={len(self.presigned_calls)}"


def delivery_service(db_session: Session, storage: FakeStorage) -> ImageDeliveryService:
    visibility = ImageVisibilityApplicationService(
        SqlAlchemyImageVisibilityRepository(db_session)
    )
    return ImageDeliveryService(
        SqlAlchemyImageFileRepository(db_session),
        visibility,
        storage,
        expires_in=900,
    )


@pytest.fixture()
def image_file_download_url_data(db_session: Session) -> None:
    user = User(
        id=21,
        username="image-owner",
        email="image-owner@example.com",
        password_hash="hash",
        salt="salt",
        real_name="影像用户",
        status="active",
    )
    other_user = User(
        id=22,
        username="other-owner",
        email="other-owner@example.com",
        password_hash="hash",
        salt="salt",
        real_name="其他用户",
        status="active",
    )
    patient = Patient(
        id=210,
        patient_id="P210",
        name="测试患者",
        gender=GenderEnum.MALE,
        status=PatientStatusEnum.ACTIVE,
    )

    db_session.add_all(
        [
            user,
            other_user,
            patient,
            make_image(101, "ready-a.png", 21, ImageFileStatusEnum.UPLOADED),
            make_image(102, "ready-b.png", 21, ImageFileStatusEnum.PROCESSED),
            make_image(103, "uploading.png", 21, ImageFileStatusEnum.UPLOADING),
            make_image(104, "other.png", 22, ImageFileStatusEnum.UPLOADED),
        ]
    )
    db_session.commit()


def make_image(
    image_id: int,
    filename: str,
    uploader_id: int,
    status: ImageFileStatusEnum,
) -> ImageFile:
    return ImageFile(
        id=image_id,
        file_uuid=f"file-{image_id}",
        original_filename=filename,
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_bucket="medical-image-files",
        object_key=f"objects/{filename}",
        storage_etag=f"etag-{image_id}",
        file_size=2048,
        uploaded_by=uploader_id,
        patient_id=210,
        status=status,
        upload_progress=100 if status != ImageFileStatusEnum.UPLOADING else 50,
        uploaded_at=datetime(2026, 5, 10),
    )


@pytest.mark.asyncio
async def test_batch_download_urls_presigns_visible_ready_files_and_sets_cache_headers(
    db_session: Session,
    image_file_download_url_data: None,
) -> None:
    storage = FakeStorage()

    response = Response()
    result = await get_image_file_download_urls(
        BatchDownloadUrlsRequest(ids=[101, 102, 101, 103, 104, 999]),
        response=response,
        current_user={"id": 21},
        service=delivery_service(db_session, storage),
        _slot=None,
    )

    data = response_data(result)
    assert sorted(data["items"]) == [101, 102]
    assert data["items"][101]["url"].endswith("signature=1")
    assert data["items"][101]["etag"] == "etag-101"
    assert data["items"][102]["filename"] == "ready-b.png"
    assert data["errors"][103]["code"] == "not_ready"
    assert data["errors"][104]["code"] == "not_found"
    assert data["errors"][999]["code"] == "not_found"
    assert storage.presigned_calls == [
        ("medical-image-files", "objects/ready-a.png", 900),
        ("medical-image-files", "objects/ready-b.png", 900),
    ]
    assert response.headers["Cache-Control"] == "private, max-age=840"
    assert response.headers["Vary"] == "Authorization"


@pytest.mark.asyncio
async def test_single_download_url_sets_private_cache_headers(
    db_session: Session,
    image_file_download_url_data: None,
) -> None:
    storage = FakeStorage()

    response = Response()
    result = await get_image_file_download_url(
        101,
        response=response,
        current_user={"id": 21},
        service=delivery_service(db_session, storage),
    )

    data = response_data(result)
    assert data["url"].endswith("signature=1")
    assert data["etag"] == "etag-101"
    assert response.headers["Cache-Control"] == "private, max-age=840"
    assert response.headers["Vary"] == "Authorization"


@pytest.mark.asyncio
async def test_image_stats_aggregates_visible_files(
    db_session: Session,
    image_file_download_url_data: None,
) -> None:
    result = get_image_stats(
        current_user={"id": 21},
        service=build_imaging_query_service(db_session),
    )

    data = response_data(result)
    assert data["total_files"] == 3
    assert data["total_size"] == 6144
    assert data["by_type"] == {"PNG": 3}
    assert data["by_status"] == {
        "UPLOADED": 1,
        "PROCESSED": 1,
        "UPLOADING": 1,
    }
