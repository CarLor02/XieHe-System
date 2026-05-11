from types import SimpleNamespace

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
        "AI_FRONT_PREDICT_OBJECT_URL",
        "http://front/predict_object",
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
            "http://front/predict_object",
            {
                "bucket": "medical-image-files",
                "object_key": "objects/front.png",
                "image_id": "IMG301",
            },
        )
    ]


@pytest.mark.asyncio
async def test_ai_detect_keypoints_uses_lateral_model_for_side_view(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: list[tuple[str, dict]] = []

    async def fake_post(url: str, payload: dict) -> dict:
        calls.append((url, payload))
        return {"vertebrae": []}

    monkeypatch.setattr(
        file_handlers,
        "get_visible_image_file",
        lambda db, file_id, current_user: make_image(
            image_id=file_id,
            object_key="objects/side.png",
            status=ImageFileStatusEnum.PROCESSED,
            description="侧位X光片",
        ),
    )
    monkeypatch.setattr(
        file_handlers.settings,
        "AI_LATERAL_DETECT_OBJECT_URL",
        "http://side/detect_object",
    )
    monkeypatch.setattr(file_handlers, "_post_ai_object_request", fake_post)

    await file_handlers.run_image_file_ai_detect_keypoints(
        302,
        current_user={"id": 31},
        db=object(),
    )

    assert calls[0][0] == "http://side/detect_object"
    assert calls[0][1]["object_key"] == "objects/side.png"


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
