from types import SimpleNamespace

import pytest

from app.core.config import settings
from app.services.ai_model_client import AiModelRequestError
from app.workers.ai_worker import AiTaskProcessor


class StubModelClient:
    def __init__(self, results):
        self._results = iter(results)
        self.calls = 0

    async def predict(self, _image):
        self.calls += 1
        result = next(self._results)
        if isinstance(result, Exception):
            raise result
        return result


def test_ai_worker_event_contract_rejects_unknown_versions():
    with pytest.raises(ValueError, match="unsupported event version"):
        AiTaskProcessor._event_ids(
            {
                "event_type": "image.ai.predict.requested",
                "version": 2,
                "task_id": "task-1",
                "batch_item_id": 1,
                "image_file_id": 2,
                "requested_by": 3,
            }
        )


@pytest.mark.asyncio
async def test_ai_worker_retries_transient_model_errors(monkeypatch):
    model_client = StubModelClient(
        [
            AiModelRequestError("temporarily unavailable", status_code=503),
            {"code": 200, "data": {"annotation": {}}},
        ]
    )
    processor = AiTaskProcessor(model_client)
    monkeypatch.setattr(settings, "AI_MODEL_MAX_RETRIES", 3)

    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr("app.workers.ai_worker.asyncio.sleep", no_sleep)

    result = await processor._predict_with_retries(SimpleNamespace(id=1))

    assert result["code"] == 200
    assert model_client.calls == 2


@pytest.mark.asyncio
async def test_ai_worker_does_not_retry_permanent_model_errors(monkeypatch):
    model_client = StubModelClient(
        [AiModelRequestError("invalid image", status_code=400)]
    )
    processor = AiTaskProcessor(model_client)
    monkeypatch.setattr(settings, "AI_MODEL_MAX_RETRIES", 3)

    with pytest.raises(AiModelRequestError, match="invalid image"):
        await processor._predict_with_retries(SimpleNamespace(id=1))

    assert model_client.calls == 1
