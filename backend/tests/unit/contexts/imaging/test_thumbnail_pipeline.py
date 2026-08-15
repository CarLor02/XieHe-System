from __future__ import annotations

import io
from dataclasses import asdict, replace
from datetime import datetime
from typing import Any, cast

import pytest
from PIL import Image

from app.contexts.imaging.application import (
    ThumbnailTaskProcessor,
)
from app.contexts.imaging.application.dto import (
    ThumbnailGenerationResult,
    ThumbnailGenerationSource,
    ThumbnailTaskEvent,
)
from app.contexts.imaging.application.errors import ThumbnailGenerationError
from app.contexts.imaging.domain import (
    ImageFileTypeEnum,
    build_card_thumbnail_object_key,
)
from app.contexts.imaging.infrastructure.thumbnail import (
    PillowThumbnailGenerationGateway,
)
from app.shared.storage import StorageObjectStat


def _event() -> ThumbnailTaskEvent:
    return ThumbnailTaskEvent(
        event_type="image.thumbnail.generate.requested",
        version=1,
        derivative_id=8,
        image_file_id=12,
        source_storage_etag="source-v1",
    )


def _source() -> ThumbnailGenerationSource:
    return ThumbnailGenerationSource(
        derivative_id=8,
        image_file_id=12,
        file_uuid="file-12",
        file_type=ImageFileTypeEnum.PNG,
        source_bucket="images",
        source_object_key="file-12/original.png",
        expected_source_etag="source-v1",
        previous_thumbnail_bucket=None,
        previous_thumbnail_object_key=None,
    )


class FakeTaskRepository:
    def __init__(self, source: ThumbnailGenerationSource | None = None) -> None:
        self.source = source
        self.ready: list[ThumbnailGenerationResult] = []
        self.failures: list[dict[str, Any]] = []

    def claim(self, *_args: Any, **_kwargs: Any) -> ThumbnailGenerationSource | None:
        return self.source

    def mark_ready(
        self, _event: ThumbnailTaskEvent, result: ThumbnailGenerationResult
    ) -> bool:
        self.ready.append(result)
        return True

    def mark_failed(self, _event: ThumbnailTaskEvent, **kwargs: Any) -> None:
        self.failures.append(kwargs)


class FakeGenerator:
    def __init__(self, error: ThumbnailGenerationError | None = None) -> None:
        self.error = error
        self.deleted: list[tuple[str, str]] = []

    async def generate(
        self, _source: ThumbnailGenerationSource
    ) -> ThumbnailGenerationResult:
        if self.error is not None:
            raise self.error
        return ThumbnailGenerationResult(
            source_storage_etag="source-v1",
            storage_bucket="images",
            object_key="file-12/derivatives/card-thumbnail/v1.webp",
            storage_etag="thumb-v1",
            mime_type="image/webp",
            width=640,
            height=960,
            file_size=123,
        )

    async def delete(self, *, bucket: str, object_key: str) -> None:
        self.deleted.append((bucket, object_key))


@pytest.mark.asyncio
async def test_task_processor_replaces_previous_thumbnail_before_ready() -> None:
    source = replace(
        _source(),
        previous_thumbnail_bucket="images",
        previous_thumbnail_object_key="old.webp",
    )
    repository = FakeTaskRepository(source)
    generator = FakeGenerator()
    processor = ThumbnailTaskProcessor(
        cast(Any, repository),
        cast(Any, generator),
        lease_seconds=300,
        max_retries=5,
        now=lambda: datetime(2026, 8, 15),
    )

    assert await processor.process(asdict(_event())) == "ack"
    assert generator.deleted == [("images", "old.webp")]
    assert len(repository.ready) == 1


@pytest.mark.asyncio
async def test_task_processor_classifies_permanent_generation_failure() -> None:
    repository = FakeTaskRepository(_source())
    generator = FakeGenerator(ThumbnailGenerationError("corrupt", transient=False))
    processor = ThumbnailTaskProcessor(
        cast(Any, repository),
        cast(Any, generator),
        lease_seconds=300,
        max_retries=5,
        now=lambda: datetime(2026, 8, 15),
    )

    await processor.process(asdict(_event()))

    assert repository.failures[0]["error"] == "corrupt"
    assert repository.failures[0]["transient"] is False


class FakeStorageClient:
    def __init__(self, payload: bytes) -> None:
        self.payload = payload
        self.uploaded: bytes | None = None

    async def stat_object(self, **_kwargs: Any) -> StorageObjectStat:
        return StorageObjectStat(
            bucket="images",
            object_key="original.png",
            size=len(self.payload),
            etag="source-v1",
            content_type="image/png",
            metadata={},
        )

    async def download_object_to(self, *, destination: Any, **_kwargs: Any) -> None:
        destination.write(self.payload)

    async def put_object(self, *, data: bytes, **_kwargs: Any) -> dict[str, str]:
        self.uploaded = data
        return {"etag": "thumb-v1"}

    async def delete_object(self, **_kwargs: Any) -> None:
        return None


@pytest.mark.asyncio
async def test_pillow_generator_keeps_aspect_ratio_without_cropping() -> None:
    original = io.BytesIO()
    Image.new("L", (1200, 800), color=127).save(original, format="PNG")
    client = FakeStorageClient(original.getvalue())
    gateway = PillowThumbnailGenerationGateway(cast(Any, client))

    result = await gateway.generate(_source())

    assert (result.width, result.height) == (640, 427)
    assert result.mime_type == "image/webp"
    assert client.uploaded is not None
    with Image.open(io.BytesIO(client.uploaded)) as thumbnail:
        assert thumbnail.size == (640, 427)


def test_card_thumbnail_key_is_stable_and_versioned() -> None:
    first = build_card_thumbnail_object_key("uuid", '"etag-v1"')
    second = build_card_thumbnail_object_key("uuid", "etag-v1")
    changed = build_card_thumbnail_object_key("uuid", "etag-v2")

    assert first == second
    assert first != changed
    assert first.startswith("uuid/derivatives/card-thumbnail/")
