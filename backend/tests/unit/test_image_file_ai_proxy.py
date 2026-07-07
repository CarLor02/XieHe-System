from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException

from app.api.v1.endpoints.imaging.handlers import files as file_handlers
from app.models.image_file import ImageFileStatusEnum


def make_image(
    *,
    image_id: int,
    object_key: str,
    status: ImageFileStatusEnum = ImageFileStatusEnum.UPLOADED,
    description: str = "正位X光片",
):
    return SimpleNamespace(
        id=image_id,
        storage_bucket="medical-image-files",
        object_key=object_key,
        status=status,
        description=description,
    )


@pytest.mark.asyncio
async def test_ai_object_request_reuses_lifecycle_client() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"ok": True})

    await file_handlers.stop_ai_object_client()
    await file_handlers.start_ai_object_client(httpx.MockTransport(handler))
    first_client = file_handlers._ai_object_client

    try:
        first = await file_handlers._post_ai_object_request("http://ai/predict", {"image_id": "IMG1"})
        second = await file_handlers._post_ai_object_request("http://ai/predict", {"image_id": "IMG2"})
        assert file_handlers._ai_object_client is first_client
    finally:
        await file_handlers.stop_ai_object_client()

    assert first == {"ok": True}
    assert second == {"ok": True}
    assert len(requests) == 2
    assert first_client is not None


@pytest.mark.asyncio
async def test_ai_predict_posts_visible_object_ref_to_front_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, dict]] = []

    async def fake_post(url: str, payload: dict) -> dict:
        calls.append((url, payload))
        return {"imageId": payload["image_id"], "measurements": []}

    monkeypatch.setattr(
        file_handlers,
        "get_visible_image_file",
        lambda db, file_id, current_user: make_image(
            image_id=file_id,
            object_key="objects/front.png",
        ),
    )
    monkeypatch.setattr(
        file_handlers.settings,
        "AI_AP_MEASUREMENT_OBJECT_URL",
        "http://front/api/measurement",
    )
    monkeypatch.setattr(file_handlers, "_post_ai_object_request", fake_post)

    result = await file_handlers.run_image_file_ai_predict(
        301,
        current_user={"id": 31},
        db=object(),
    )

    assert result["imageId"] == "IMG301"
    assert calls == [
        (
            "http://front/api/measurement",
            {
                "bucket": "medical-image-files",
                "object_key": "objects/front.png",
                "image_id": "IMG301",
            },
        )
    ]


@pytest.mark.asyncio
async def test_ai_predict_posts_lateral_object_ref_to_lat_measurement_model(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, dict]] = []

    async def fake_post(url: str, payload: dict) -> dict:
        calls.append((url, payload))
        return {"imageId": payload["image_id"], "measurements": []}

    monkeypatch.setattr(
        file_handlers,
        "get_visible_image_file",
        lambda db, file_id, current_user: make_image(
            image_id=file_id,
            object_key="objects/side.png",
            description="侧位X光片",
        ),
    )
    monkeypatch.setattr(
        file_handlers.settings,
        "AI_LAT_MEASUREMENT_OBJECT_URL",
        "http://lat/api/measurement",
    )
    monkeypatch.setattr(file_handlers, "_post_ai_object_request", fake_post)

    result = await file_handlers.run_image_file_ai_predict(
        302,
        current_user={"id": 31},
        db=object(),
    )

    assert result["imageId"] == "IMG302"
    assert calls == [
        (
            "http://lat/api/measurement",
            {
                "bucket": "medical-image-files",
                "object_key": "objects/side.png",
                "image_id": "IMG302",
            },
        )
    ]


def test_ai_detect_keypoints_route_is_not_registered() -> None:
    paths = {route.path for route in file_handlers.router.routes}

    assert "/{file_id}/ai/detect-keypoints" not in paths


@pytest.mark.asyncio
async def test_ai_proxy_rejects_unready_or_invisible_image(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(
        file_handlers,
        "get_visible_image_file",
        lambda db, file_id, current_user: make_image(
            image_id=file_id,
            object_key="objects/uploading.png",
            status=ImageFileStatusEnum.UPLOADING,
        ),
    )

    with pytest.raises(HTTPException) as unready:
        await file_handlers.run_image_file_ai_predict(
            303,
            current_user={"id": 31},
            db=object(),
        )
    assert unready.value.status_code == 409

    monkeypatch.setattr(
        file_handlers,
        "get_visible_image_file",
        lambda db, file_id, current_user: None,
    )

    with pytest.raises(HTTPException) as invisible:
        await file_handlers.run_image_file_ai_predict(
            304,
            current_user={"id": 31},
            db=object(),
        )
    assert invisible.value.status_code == 404
