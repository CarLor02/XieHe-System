import json
from datetime import datetime

import httpx
import pytest

from app.contexts.imaging.application import ImagePredictionService
from app.contexts.imaging.application.errors import (
    AiMeasurementUnavailableError,
    ImageNotReadyError,
)
from app.contexts.imaging.domain import ImageAccessActor, ImageFileNotFoundError
from app.contexts.imaging.infrastructure.ai import measurement_gateway
from app.contexts.imaging.infrastructure.ai.measurement_gateway import (
    AiModelMeasurementGateway,
    start_ai_measurement_client,
    stop_ai_measurement_client,
)
from app.contexts.imaging.interface.http.v1.routes.predictions import router
from app.models.image_file import ImageFile, ImageFileStatusEnum, ImageFileTypeEnum
from app.services import ai_model_client


def make_image(
    *,
    image_id: int,
    object_key: str,
    status: ImageFileStatusEnum = ImageFileStatusEnum.UPLOADED,
    description: str = "正位X光片",
) -> ImageFile:
    return ImageFile(
        id=image_id,
        file_uuid=f"file-{image_id}",
        original_filename="xray.png",
        file_type=ImageFileTypeEnum.PNG,
        file_size=10,
        storage_bucket="medical-image-files",
        object_key=object_key,
        uploaded_by=31,
        status=status,
        description=description,
        created_at=datetime(2026, 8, 2),
    )


class FakeVisibility:
    def __init__(self, image: ImageFile | None) -> None:
        self.image = image

    def get_visible_image(
        self,
        image_file_id: int,
        actor: ImageAccessActor,
    ) -> ImageFile | None:
        return self.image


class FakeGateway:
    async def predict(self, image: ImageFile) -> dict[str, object]:
        return {"imageId": f"IMG{image.id}", "measurements": []}


@pytest.mark.asyncio
async def test_ai_measurement_gateway_reuses_lifecycle_client(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"ok": True})

    monkeypatch.setattr(
        measurement_gateway.AiModelClient,
        "measurement_url",
        lambda _image: "http://ai/predict",
    )
    await stop_ai_measurement_client()
    await start_ai_measurement_client(httpx.MockTransport(handler))
    first_client = measurement_gateway._client._client
    gateway = AiModelMeasurementGateway()
    try:
        first = await gateway.predict(make_image(image_id=1, object_key="front.png"))
        second = await gateway.predict(make_image(image_id=2, object_key="side.png"))
        assert measurement_gateway._client._client is first_client
    finally:
        await stop_ai_measurement_client()

    assert first == {"ok": True}
    assert second == {"ok": True}
    assert len(requests) == 2
    assert first_client is not None


@pytest.mark.asyncio
async def test_ai_measurement_gateway_maps_model_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def handler(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(422, json={"detail": "invalid image"})

    monkeypatch.setattr(
        measurement_gateway.AiModelClient,
        "measurement_url",
        lambda _image: "http://ai/predict",
    )
    await stop_ai_measurement_client()
    await start_ai_measurement_client(httpx.MockTransport(handler))
    try:
        with pytest.raises(AiMeasurementUnavailableError) as error:
            await AiModelMeasurementGateway().predict(
                make_image(image_id=1, object_key="front.png")
            )
    finally:
        await stop_ai_measurement_client()

    assert error.value.status_code == 422
    assert "invalid image" in error.value.detail


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("description", "expected_url"),
    [
        ("正位X光片", "http://front/api/measurement"),
        ("侧位X光片", "http://lat/api/measurement"),
    ],
)
async def test_ai_gateway_selects_exam_specific_endpoint(
    monkeypatch: pytest.MonkeyPatch,
    description: str,
    expected_url: str,
) -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, json={"measurements": []})

    monkeypatch.setattr(
        ai_model_client.settings,
        "AI_AP_MEASUREMENT_OBJECT_URL",
        "http://front/api/measurement",
    )
    monkeypatch.setattr(
        ai_model_client.settings,
        "AI_LAT_MEASUREMENT_OBJECT_URL",
        "http://lat/api/measurement",
    )
    await stop_ai_measurement_client()
    await start_ai_measurement_client(httpx.MockTransport(handler))
    try:
        await AiModelMeasurementGateway().predict(
            make_image(
                image_id=302,
                object_key="objects/image.png",
                description=description,
            )
        )
    finally:
        await stop_ai_measurement_client()

    assert str(requests[0].url) == expected_url
    assert json.loads(requests[0].content) == {
        "bucket": "medical-image-files",
        "object_key": "objects/image.png",
        "image_id": "IMG302",
    }


def test_ai_detect_keypoints_route_is_not_registered() -> None:
    paths = {route.path for route in router.routes}

    assert "/{file_id}/ai/detect-keypoints" not in paths


@pytest.mark.asyncio
async def test_prediction_service_rejects_unready_or_invisible_image() -> None:
    unready = make_image(
        image_id=303,
        object_key="objects/uploading.png",
        status=ImageFileStatusEnum.UPLOADING,
    )
    with pytest.raises(ImageNotReadyError):
        await ImagePredictionService(FakeVisibility(unready), FakeGateway()).predict(
            303,
            ImageAccessActor(user_id=31),
        )

    with pytest.raises(ImageFileNotFoundError):
        await ImagePredictionService(FakeVisibility(None), FakeGateway()).predict(
            304,
            ImageAccessActor(user_id=31),
        )
