import pytest

from app.contexts.imaging.application import AiTaskProcessor
from app.contexts.imaging.application.dto import AiImageReference, AiTaskEvent
from app.contexts.imaging.application.errors import AiTaskModelError


class StubModelGateway:
    def __init__(self, results):
        self._results = iter(results)
        self.calls = 0

    async def predict(self, _image):
        self.calls += 1
        result = next(self._results)
        if isinstance(result, Exception):
            raise result
        return result


class StubTaskRepository:
    def __init__(self, image: AiImageReference | None) -> None:
        self.image = image
        self.success: tuple[AiTaskEvent, dict] | None = None
        self.retry: tuple[AiTaskEvent, str] | None = None
        self.failed: tuple[AiTaskEvent, str] | None = None

    def claim(self, _event: AiTaskEvent) -> AiImageReference | None:
        return self.image

    def mark_success(self, event: AiTaskEvent, response: dict) -> None:
        self.success = (event, response)

    def mark_retry(self, event: AiTaskEvent, error: str) -> None:
        self.retry = (event, error)

    def mark_failed(self, event: AiTaskEvent, error: str) -> None:
        self.failed = (event, error)


def image_reference() -> AiImageReference:
    return AiImageReference(
        id=1,
        storage_bucket="medical-images",
        object_key="image.jpg",
        description="正位X光片",
    )


def task_event() -> dict:
    return {
        "event_type": "image.ai.predict.requested",
        "version": 1,
        "task_id": "task-1",
        "batch_id": "batch-1",
        "batch_item_id": 1,
        "image_file_id": 2,
        "requested_by": 3,
    }


def test_ai_worker_event_contract_rejects_unknown_versions():
    with pytest.raises(ValueError, match="unsupported event version"):
        event = task_event()
        event["version"] = 2
        AiTaskProcessor.parse_event(event)


@pytest.mark.asyncio
async def test_ai_worker_retries_transient_model_errors():
    model = StubModelGateway(
        [
            AiTaskModelError("temporarily unavailable", transient=True),
            {"code": 200, "data": {"annotation": {}}},
        ]
    )

    async def no_sleep(_seconds):
        return None

    processor = AiTaskProcessor(
        StubTaskRepository(image_reference()),
        model,
        max_retries=3,
        sleep=no_sleep,
    )

    result = await processor.predict_with_retries(image_reference())

    assert result["code"] == 200
    assert model.calls == 2


@pytest.mark.asyncio
async def test_ai_worker_does_not_retry_permanent_model_errors():
    model = StubModelGateway([AiTaskModelError("invalid image", transient=False)])
    processor = AiTaskProcessor(
        StubTaskRepository(image_reference()),
        model,
        max_retries=3,
    )

    with pytest.raises(AiTaskModelError, match="invalid image"):
        await processor.predict_with_retries(image_reference())

    assert model.calls == 1


@pytest.mark.asyncio
async def test_ai_worker_persists_success_through_repository_port():
    repository = StubTaskRepository(image_reference())
    processor = AiTaskProcessor(
        repository,
        StubModelGateway([{"code": 200}]),
        max_retries=1,
    )

    outcome = await processor.process(task_event())

    assert outcome == "ack"
    assert repository.success is not None
    assert repository.success[0].batch_id == "batch-1"
    assert repository.success[1] == {"code": 200}


@pytest.mark.asyncio
async def test_ai_worker_returns_retry_for_transient_terminal_error():
    repository = StubTaskRepository(image_reference())
    processor = AiTaskProcessor(
        repository,
        StubModelGateway([AiTaskModelError("unavailable", transient=True)]),
        max_retries=1,
    )

    outcome = await processor.process(task_event())

    assert outcome == "retry"
    assert repository.retry is not None
    assert repository.failed is None
