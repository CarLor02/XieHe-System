from datetime import datetime

import pytest
from fastapi import Response
from sqlalchemy.orm import Session

from app.api.v1.endpoints.imaging.handlers import files as file_handlers
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.models.patient import GenderEnum, Patient, PatientStatusEnum
from app.models.user import User


pytestmark = pytest.mark.database


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
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    request_cls = getattr(file_handlers, "BatchDownloadUrlsRequest", None)
    assert request_cls is not None

    presigned_calls: list[tuple[str, str, int]] = []

    async def fake_presign_get(bucket: str, object_key: str, expires_in: int) -> str:
        presigned_calls.append((bucket, object_key, expires_in))
        return f"/{bucket}/{object_key}?signature={len(presigned_calls)}"

    monkeypatch.setattr(file_handlers.storage_gateway, "presign_get", fake_presign_get)

    response = Response()
    result = await file_handlers.get_image_file_download_urls(
        request_cls(ids=[101, 102, 101, 103, 104, 999]),
        response=response,
        current_user={"id": 21},
        db=db_session,
    )

    data = result["data"]
    assert sorted(data["items"]) == [101, 102]
    assert data["items"][101]["url"].endswith("signature=1")
    assert data["items"][101]["etag"] == "etag-101"
    assert data["items"][102]["filename"] == "ready-b.png"
    assert data["errors"][103]["code"] == "not_ready"
    assert data["errors"][104]["code"] == "not_found"
    assert data["errors"][999]["code"] == "not_found"
    assert presigned_calls == [
        ("medical-image-files", "objects/ready-a.png", 900),
        ("medical-image-files", "objects/ready-b.png", 900),
    ]
    assert response.headers["Cache-Control"] == "private, max-age=840"
    assert response.headers["Vary"] == "Authorization"


@pytest.mark.asyncio
async def test_single_download_url_sets_private_cache_headers(
    db_session: Session,
    image_file_download_url_data: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    async def fake_presign_get(bucket: str, object_key: str, expires_in: int) -> str:
        return f"/{bucket}/{object_key}?signature=single"

    monkeypatch.setattr(file_handlers.storage_gateway, "presign_get", fake_presign_get)

    response = Response()
    result = await file_handlers.get_image_file_download_url(
        101,
        response=response,
        current_user={"id": 21},
        db=db_session,
    )

    assert result["data"]["url"].endswith("signature=single")
    assert result["data"]["etag"] == "etag-101"
    assert response.headers["Cache-Control"] == "private, max-age=840"
    assert response.headers["Vary"] == "Authorization"
