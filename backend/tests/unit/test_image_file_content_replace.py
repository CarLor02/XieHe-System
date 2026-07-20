from datetime import datetime
from typing import Any

import pytest

from app.api.v1.endpoints.imaging.handlers import files as file_handlers
from app.models.image import ImageAnnotation
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum


class FakeQuery:
    def __init__(self, db: "FakeSession", model: Any) -> None:
        self.db = db
        self.model = model

    def filter(self, *args: Any, **kwargs: Any) -> "FakeQuery":
        return self

    def first(self) -> ImageFile | None:
        if self.model is ImageFile:
            return self.db.image
        return None

    def delete(self, synchronize_session: bool = False) -> int:
        if self.model is ImageAnnotation:
            self.db.annotation_delete_called = True
            return self.db.annotation_delete_count
        return 0


class FakeSession:
    def __init__(self, image: ImageFile) -> None:
        self.image = image
        self.annotation_delete_count = 1
        self.annotation_delete_called = False
        self.committed = False
        self.rolled_back = False

    def query(self, model: Any) -> FakeQuery:
        return FakeQuery(self, model)

    def commit(self) -> None:
        self.committed = True

    def rollback(self) -> None:
        self.rolled_back = True

    def refresh(self, image: ImageFile) -> None:
        self.image = image


class FakeUploadFile:
    def __init__(
        self,
        *,
        filename: str,
        content_type: str,
        content: bytes,
    ) -> None:
        self.filename = filename
        self.content_type = content_type
        self._content = content

    async def read(self) -> bytes:
        return self._content


def make_image() -> ImageFile:
    return ImageFile(
        id=301,
        file_uuid="file-301",
        original_filename="original.png",
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_bucket="medical-image-files",
        object_key="file-301/original.png",
        storage_etag="old-etag",
        file_size=128,
        file_hash="old-hash",
        thumbnail_path="file-301/thumb.png",
        uploaded_by=31,
        patient_id=310,
        description="正位X光片",
        annotation={"measurements": [{"id": "m1"}]},
        status=ImageFileStatusEnum.PROCESSED,
        upload_progress=100,
        created_at=datetime(2026, 6, 10, 9, 0, 0),
        uploaded_at=datetime(2026, 6, 10, 10, 0, 0),
    )


@pytest.mark.asyncio
async def test_replace_image_content_keeps_id_and_clears_annotations(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    uploaded_bytes = b"edited-image"
    put_calls: list[dict[str, object]] = []

    async def fake_put_object(
        *,
        bucket: str,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> dict[str, str]:
        put_calls.append(
            {
                "bucket": bucket,
                "object_key": object_key,
                "data": data,
                "content_type": content_type,
            }
        )
        return {"etag": "new-etag"}

    monkeypatch.setattr(file_handlers.storage_gateway, "put_object", fake_put_object)
    monkeypatch.setattr(
        file_handlers,
        "get_visible_image_file",
        lambda db, file_id, current_user: db.image,
    )
    monkeypatch.setattr(
        file_handlers,
        "_image_file_related_metadata",
        lambda *args, **kwargs: file_handlers.ImageFileRelatedMetadata(
            uploader_name="替换用户",
            patient_name="替换患者",
            patient_identifier="P301",
            patient_gender="FEMALE",
            patient_age=35,
        ),
    )

    db = FakeSession(make_image())
    upload = FakeUploadFile(
        filename="edited.png",
        content_type="image/png",
        content=uploaded_bytes,
    )

    result = await file_handlers.replace_image_file_content(
        301,
        file=upload,
        description="侧位X光片",
        current_user={"id": 31, "username": "replace-owner"},
        db=db,
    )

    data = result["data"]
    assert data["id"] == 301
    assert data["object_key"] == "file-301/original.png"
    assert data["file_size"] == len(uploaded_bytes)
    assert data["storage_etag"] == "new-etag"
    assert data["thumbnail_path"] is None
    assert data["description"] == "侧位X光片"
    assert data["annotation"] is None
    assert data["status"] == "UPLOADED"
    assert put_calls == [
        {
            "bucket": "medical-image-files",
            "object_key": "file-301/original.png",
            "data": uploaded_bytes,
            "content_type": "image/png",
        }
    ]
    assert db.image.id == 301
    assert db.image.object_key == "file-301/original.png"
    assert db.image.file_size == len(uploaded_bytes)
    assert db.image.file_hash is None
    assert db.image.thumbnail_path is None
    assert db.image.annotation is None
    assert db.image.status == ImageFileStatusEnum.UPLOADED
    assert db.annotation_delete_called is True
    assert db.committed is True
