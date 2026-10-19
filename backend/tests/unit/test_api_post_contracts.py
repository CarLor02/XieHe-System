"""执行真实 HTTP 解析/序列化，用例替身不访问数据库或对象存储。"""

from datetime import datetime
from types import SimpleNamespace
from typing import Any

import httpx
import pytest
from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError

from app.api.v1.api import api_router
from app.contexts.access_control.interface.http.v1.dependencies import (
    get_current_active_user,
)
from app.contexts.patients.interface.http.v1.dependencies import get_patient_service
from app.core.system.exceptions import validation_exception_handler
from app.main import app as production_app


class PatientService:
    def __init__(self) -> None:
        self.query: Any = None
        self.changes: dict[str, object] = {}

    async def list_patients(self, query: object) -> tuple[list[object], int]:
        self.query = query
        return [], 0

    async def update_patient(
        self, patient_id: int, changes: dict[str, object], *, actor_id: int
    ) -> SimpleNamespace:
        assert patient_id == 7
        assert actor_id == 11
        self.changes = changes
        return SimpleNamespace(
            id=7,
            patient_id="P-7",
            name="测试患者",
            gender="未知",
            birth_date=None,
            age=None,
            phone=None,
            email=None,
            address=None,
            emergency_contact_name=None,
            emergency_contact_phone=None,
            id_card=None,
            insurance_number=None,
            status="active",
            created_at=datetime(2026, 10, 19),
            updated_at=None,
        )


@pytest.fixture
def api() -> tuple[FastAPI, PatientService]:
    app = FastAPI()
    app.include_router(api_router, prefix="/api/v1")
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    service = PatientService()
    app.dependency_overrides[get_current_active_user] = lambda: {"id": 11}
    app.dependency_overrides[get_patient_service] = lambda: service
    return app, service


@pytest.mark.api
async def test_patient_query_uses_json_body_and_preserves_pagination(
    api: tuple[FastAPI, PatientService],
) -> None:
    app, service = api
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/patients/list",
            json={"page": 2, "page_size": 5, "search": "测试", "status": "active"},
        )
        assert response.status_code == 200
        assert response.json()["data"] == {
            "items": [],
            "pagination": {"total": 0, "page": 2, "page_size": 5, "total_pages": 0},
        }
        assert service.query.search == "测试"
        assert service.query.status == "active"
        assert (await client.get("/api/v1/patients/list")).status_code == 405


@pytest.mark.api
async def test_update_keeps_explicit_null_and_excludes_routing_id(
    api: tuple[FastAPI, PatientService],
) -> None:
    app, service = api
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/patients/update", json={"patient_id": 7, "phone": None}
        )
        assert response.status_code == 200
        assert service.changes == {"phone": None}
        assert response.json()["data"]["created_at"] == "2026-10-19T00:00:00"


@pytest.mark.api
async def test_validation_error_matches_documented_envelope(
    api: tuple[FastAPI, PatientService],
) -> None:
    app, _ = api
    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post("/api/v1/patients/list", json={"page": 0})
    assert response.status_code == 422
    assert response.json()["details"][0]["field"] == "body.page"
    schema = production_app.openapi()
    assert schema["paths"]["/api/v1/patients/list"]["post"]["responses"]["422"][
        "content"
    ]["application/json"]["schema"] == {"$ref": "#/components/schemas/ErrorResponse"}


def test_storage_methods_and_operational_probes_remain_available() -> None:
    schema = production_app.openapi()
    paths = schema["paths"]
    preserved = {
        "/api/v1/upload/sessions": "post",
        "/api/v1/upload/sessions/{session_id}": "get",
        "/api/v1/upload/sessions/{session_id}/complete": "post",
        "/api/v1/upload/batches/config": "get",
        "/api/v1/upload/batches/{batch_id}/items": "get",
        "/api/v1/image-files/{file_id}/download-url": "get",
        "/api/v1/image-files/{file_id}/download": "get",
        "/api/v1/image-files/download-urls": "post",
        "/api/v1/image-files/{file_id}/content": "patch",
        "/api/v1/image-files/{file_id}": "delete",
        "/api/v1/auth/me/avatar": "delete",
        "/api/v1/auth/me/avatar/upload-session": "post",
        "/api/v1/auth/me/avatar/complete": "post",
        "/health": "get",
    }
    for path, method in preserved.items():
        assert method in paths[path], path
    assert (
        "multipart/form-data"
        in paths["/api/v1/image-files/{file_id}/content"]["patch"]["requestBody"][
            "content"
        ]
    )
