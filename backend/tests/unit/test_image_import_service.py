from types import SimpleNamespace

from app.contexts.imaging.domain import (
    AITaskStatusEnum,
    ImageImportAiStatus,
    ImageImportBatchStatus,
    ImageImportUploadStatus,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyImageImportRepository,
)


class FakeQuery:
    def __init__(self, items):
        self.items = items

    def filter(self, *_args):
        return self

    def all(self):
        return self.items


class FakeDb:
    def __init__(self, items):
        self.items = items

    def query(self, _model):
        return FakeQuery(self.items)


def test_refresh_batch_status_marks_partial_failure() -> None:
    batch = SimpleNamespace(
        id=9,
        status=ImageImportBatchStatus.UPLOADING.value,
        completed_at=None,
    )
    items = [
        SimpleNamespace(
            upload_status=ImageImportUploadStatus.UPLOADED.value,
            ai_status=ImageImportAiStatus.SUCCEEDED.value,
        ),
        SimpleNamespace(
            upload_status=ImageImportUploadStatus.UPLOADED.value,
            ai_status=ImageImportAiStatus.FAILED.value,
        ),
    ]

    SqlAlchemyImageImportRepository(FakeDb(items)).refresh_batch_status(batch)

    assert batch.status == ImageImportBatchStatus.PARTIAL_FAILED.value
    assert batch.total_items == 2
    assert batch.succeeded_items == 1
    assert batch.failed_items == 1
    assert batch.completed_at is not None


def test_ai_task_event_uses_stable_versioned_shape() -> None:
    task = SimpleNamespace(
        task_id="task-1",
        created_by=5,
        status=AITaskStatusEnum.PENDING,
    )
    item = SimpleNamespace(id=3, image_file_id=11)
    batch = SimpleNamespace(batch_id="batch-1")

    event = SqlAlchemyImageImportRepository(FakeDb([])).ai_task_event(
        task,
        item,
        batch,
    )

    assert event.event_type == "image.ai.predict.requested"
    assert event.version == 1
    assert event.task_id == "task-1"
    assert event.batch_id == "batch-1"
    assert event.batch_item_id == 3
    assert event.image_file_id == 11
    assert event.requested_by == 5
