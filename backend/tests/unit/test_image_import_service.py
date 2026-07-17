from types import SimpleNamespace

from app.models.image import AITaskStatusEnum
from app.models.image_import import (
    ImageImportAiStatus,
    ImageImportBatchStatus,
    ImageImportUploadStatus,
)
from app.services.image_import_service import ai_task_event, refresh_batch_status


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

    refresh_batch_status(FakeDb(items), batch)

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

    assert ai_task_event(task, item, batch) == {
        "event_type": "image.ai.predict.requested",
        "version": 1,
        "task_id": "task-1",
        "batch_id": "batch-1",
        "batch_item_id": 3,
        "image_file_id": 11,
        "requested_by": 5,
    }
