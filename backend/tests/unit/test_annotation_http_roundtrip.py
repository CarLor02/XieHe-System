"""经过真实路由的响应序列化，防止递归 JSON 的 bool 被转换成数字。"""

from copy import deepcopy
from datetime import datetime
from types import SimpleNamespace

import httpx
import pytest
from fastapi import FastAPI

from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.imaging.application.dto import (
    AnnotationBatchItem,
    AnnotationEventItem,
    AnnotationHistoryVersion,
    ImageDetail,
    ImageSummary,
)
from app.contexts.imaging.domain import ImageFileStatusEnum, JsonObject
from app.contexts.imaging.interface.http.v1.dependencies import (
    get_annotation_service,
    get_imaging_query_service,
)
from app.contexts.imaging.interface.http.v1.routes import annotations, queries
from app.contexts.imaging.interface.http.v1.schemas.annotations_requests import (
    RequestSaveAnnotation,
)


@pytest.fixture
def api():
    app = FastAPI()
    app.include_router(annotations.router, prefix="/api/v1/image-files")
    app.include_router(queries.router, prefix="/api/v1/image-files")
    service = AnnotationService()
    app.dependency_overrides[get_current_active_user] = lambda: {"id": 11}
    app.dependency_overrides[get_annotation_service] = lambda: service
    app.dependency_overrides[get_imaging_query_service] = lambda: service
    return app, service


class AnnotationService:
    def __init__(self) -> None:
        self.annotation: JsonObject = {}
        self.version = 0

    def save_visible_image(self, *, annotation, expected_version, **_):
        assert expected_version == self.version
        self.annotation = deepcopy(annotation)
        self.version += 1
        return SimpleNamespace(
            changed=True,
            image_file=SimpleNamespace(
                annotation_version=self.version,
                annotation_updated_at=datetime(2026, 11, 1),
                annotation_updated_by=11,
                has_annotation=True,
                status=ImageFileStatusEnum.PROCESSED,
            ),
        )

    def get_detail(self, **_) -> ImageDetail:
        return ImageDetail(
            summary=ImageSummary(
                id=7,
                file_uuid="fixture-7",
                original_filename="fixture.png",
                file_type="PNG",
                mime_type="image/png",
                file_size=100,
                storage_bucket="fixture",
                object_key="fixture.png",
                storage_etag=None,
                thumbnail_path=None,
                uploaded_by=11,
                uploader_name=None,
                patient_id=None,
                patient_name=None,
                patient_identifier=None,
                team_ids=[],
                team_names=[],
                study_date=None,
                description="正位X光片",
                status="PROCESSED",
                upload_progress=100,
                created_at=datetime(2026, 11, 1),
                uploaded_at=None,
                has_annotation=True,
            ),
            patient_gender=None,
            patient_age=None,
            annotation=self.annotation,
            annotation_version=self.version,
            annotation_created_at=None,
            annotation_created_by=None,
            annotation_updated_at=None,
            annotation_updated_by=None,
        )

    def get_annotation_batch(self, **_) -> list[AnnotationBatchItem]:
        return [AnnotationBatchItem(7, self.annotation, self.version)]

    def get_history_version(self, **_) -> AnnotationHistoryVersion:
        return AnnotationHistoryVersion(
            version=self.version,
            snapshot=self.annotation,
            source="MANUAL",
            reason="SAVE",
            actor_id=11,
            created_at=datetime(2026, 11, 1),
            events=[
                AnnotationEventItem(
                    "MEASUREMENT",
                    "cobb-1",
                    "UPDATED",
                    {"keypointSynced": False},
                    {"keypointSynced": True},
                )
            ],
        )


def assert_json_types(annotation):
    measurement = annotation["measurements"][0]
    assert measurement["keypointSynced"] is True
    assert measurement["metadata"]["flags"] == [True, False]
    assert all(type(flag) is bool for flag in measurement["metadata"]["flags"])
    assert type(measurement["metadata"]["count"]) is int
    assert measurement["metadata"]["count"] == 1
    assert type(measurement["points"][0]["x"]) is float
    assert annotation["futureExtension"] == {
        "enabled": False,
        "name": "1",
        "empty": None,
    }
    assert annotation["futureExtension"]["enabled"] is False


@pytest.mark.api
async def test_save_reopen_batch_and_history_preserve_json_boolean_types(api):
    app, service = api
    annotation = {
        "schemaVersion": 1,
        "measurements": [
            {
                "id": "cobb-1",
                "type": "cobb1",
                "keypointSynced": True,
                "upperVertebra": "T2",
                "lowerVertebra": "T6",
                "points": [{"x": 1.25, "y": 0}],
                "metadata": {"flags": [True, False], "count": 1},
            }
        ],
        "futureExtension": {"enabled": False, "name": "1", "empty": None},
    }
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        for expected_version in (0, 1):
            saved = await client.post(
                "/api/v1/image-files/annotation/save",
                json={
                    "file_id": 7,
                    "expected_version": expected_version,
                    "annotation": annotation,
                },
            )
            assert saved.status_code == 200
            assert saved.json()["data"]["annotation_version"] == expected_version + 1
            assert_json_types(service.annotation)
            reopened = await client.post("/api/v1/image-files/get", json={"file_id": 7})
            assert reopened.status_code == 200
            annotation = reopened.json()["data"]["annotation"]
            assert_json_types(annotation)

        batch = await client.post(
            "/api/v1/image-files/annotations/batch", json={"ids": [7]}
        )
        assert batch.status_code == 200
        assert_json_types(batch.json()["data"]["items"][0]["annotation"])
        history = await client.post(
            "/api/v1/image-files/annotation-history/get",
            json={
                "file_id": 7,
                "version": 2,
            },
        )
        assert history.status_code == 200
        data = history.json()["data"]
        assert_json_types(data["snapshot"])
        assert data["events"][0]["before_payload"]["keypointSynced"] is False
        assert data["events"][0]["after_payload"]["keypointSynced"] is True


def test_annotation_serializer_still_rejects_non_json_python_values():
    with pytest.raises(ValueError):
        RequestSaveAnnotation(
            file_id=7, expected_version=0, annotation={"invalid": object()}
        )
