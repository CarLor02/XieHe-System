from __future__ import annotations

import io
from dataclasses import asdict, replace
from datetime import datetime
from typing import Any, cast

import pytest
from PIL import Image

from app.contexts.imaging.application import (
    ThumbnailBackfillService,
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
from app.contexts.imaging.infrastructure.thumbnail.display_mapping import (
    map_to_thumbnail_display_image,
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
            object_key=build_card_thumbnail_object_key("file-12", "source-v1"),
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


@pytest.mark.asyncio
async def test_generator_preserves_uint16_png_grayscale_range() -> None:
    original = io.BytesIO()
    source = Image.new("I;16", (96, 32))
    source.putdata(([0] * 32 + [32768] * 32 + [65535] * 32) * 32)
    source.save(original, format="PNG")
    client = FakeStorageClient(original.getvalue())
    gateway = PillowThumbnailGenerationGateway(cast(Any, client))

    await gateway.generate(_source())

    assert client.uploaded is not None
    with Image.open(io.BytesIO(client.uploaded)) as thumbnail:
        grayscale = thumbnail.convert("L")
        assert grayscale.getpixel((16, 16)) < 10
        assert 100 < grayscale.getpixel((48, 16)) < 155
        assert grayscale.getpixel((80, 16)) > 245


@pytest.mark.parametrize("mode", ["I;16", "I;16L", "I;16B"])
def test_display_mapping_supports_uint16_grayscale_modes(mode: str) -> None:
    source = Image.new(mode, (3, 1))
    source.putdata([0, 32768, 65535])

    mapped = map_to_thumbnail_display_image(
        source,
        source_format="TIFF",
        source_mode=mode,
    )

    assert mapped.mode == "L"
    assert list(mapped.getdata()) == [0, 127, 255]


def test_display_mapping_keeps_uint8_grayscale_values() -> None:
    source = Image.new("L", (3, 1))
    source.putdata([0, 127, 255])

    mapped = map_to_thumbnail_display_image(
        source,
        source_format="PNG",
        source_mode="L",
    )

    assert mapped.mode == "L"
    assert list(mapped.getdata()) == [0, 127, 255]


@pytest.mark.parametrize("mode", ["I", "F"])
def test_display_mapping_rejects_unknown_high_depth_ranges(mode: str) -> None:
    source = Image.new(mode, (1, 1))

    with pytest.raises(ValueError, match="无法确定显示范围"):
        map_to_thumbnail_display_image(
            source,
            source_format="TIFF",
            source_mode=mode,
        )


def test_card_thumbnail_key_is_stable_and_versioned() -> None:
    first = build_card_thumbnail_object_key("uuid", '"etag-v1"')
    second = build_card_thumbnail_object_key("uuid", "etag-v1")
    changed = build_card_thumbnail_object_key("uuid", "etag-v2")

    assert first == second
    assert first != changed
    assert first.startswith("uuid/derivatives/card-thumbnail/v2/")


@pytest.mark.asyncio
async def test_generator_applies_exif_orientation_before_scaling() -> None:
    original = io.BytesIO()
    exif = Image.Exif()
    exif[274] = 6
    Image.new("RGB", (800, 1200), color="white").save(
        original,
        format="JPEG",
        exif=exif,
    )
    client = FakeStorageClient(original.getvalue())
    gateway = PillowThumbnailGenerationGateway(cast(Any, client))

    result = await gateway.generate(
        replace(_source(), file_type=ImageFileTypeEnum.JPEG)
    )

    assert (result.width, result.height) == (640, 427)


@pytest.mark.asyncio
async def test_generator_treats_corrupt_images_as_permanent_failures() -> None:
    gateway = PillowThumbnailGenerationGateway(
        cast(Any, FakeStorageClient(b"not-an-image"))
    )

    with pytest.raises(ThumbnailGenerationError) as error:
        await gateway.generate(_source())

    assert error.value.transient is False


@pytest.mark.asyncio
async def test_generator_rejects_unknown_integer_range_as_permanent_failure() -> None:
    original = io.BytesIO()
    Image.new("I", (10, 10), color=1000).save(original, format="TIFF")
    gateway = PillowThumbnailGenerationGateway(
        cast(Any, FakeStorageClient(original.getvalue()))
    )

    with pytest.raises(ThumbnailGenerationError) as error:
        await gateway.generate(replace(_source(), file_type=ImageFileTypeEnum.TIFF))

    assert error.value.transient is False
    assert "无法确定显示范围" in error.value.detail


@pytest.mark.asyncio
async def test_generator_uses_first_tiff_frame_and_preserves_vertical_ratio() -> None:
    original = io.BytesIO()
    first = Image.new("L", (600, 1200), color=80)
    second = Image.new("L", (600, 1200), color=180)
    first.save(
        original,
        format="TIFF",
        save_all=True,
        append_images=[second],
    )
    client = FakeStorageClient(original.getvalue())
    gateway = PillowThumbnailGenerationGateway(cast(Any, client))

    result = await gateway.generate(
        replace(_source(), file_type=ImageFileTypeEnum.TIFF)
    )

    assert (result.width, result.height) == (480, 960)


class FakeBackfillRepository:
    def __init__(self, images: list[Any], ready_ids: set[int]) -> None:
        self.images = images
        self.ready_ids = ready_ids
        self.commits = 0

    def list_backfill_images(self, *, after_id: int, limit: int) -> list[Any]:
        return [image for image in self.images if image.id > after_id][:limit]

    def has_ready_for_current_source(self, image: Any) -> bool:
        return image.id in self.ready_ids

    def commit(self) -> None:
        self.commits += 1

    def rollback(self) -> None:
        return None


class FakeBackfillScheduling:
    def __init__(self, *, publish_result: bool) -> None:
        self.publish_result = publish_result
        self.prepared: list[int] = []

    def prepare(self, image: Any) -> ThumbnailTaskEvent:
        self.prepared.append(image.id)
        return ThumbnailTaskEvent(
            event_type="image.thumbnail.generate.requested",
            version=1,
            derivative_id=image.id,
            image_file_id=image.id,
            source_storage_etag=image.storage_etag,
        )

    async def publish_after_commit(self, _event: ThumbnailTaskEvent) -> bool:
        return self.publish_result


@pytest.mark.asyncio
async def test_backfill_dry_run_is_paginated_and_does_not_write() -> None:
    images = [
        cast(Any, _backfill_image(1, ImageFileTypeEnum.PNG)),
        cast(Any, _backfill_image(2, ImageFileTypeEnum.DICOM)),
        cast(Any, _backfill_image(3, ImageFileTypeEnum.JPEG)),
    ]
    repository = FakeBackfillRepository(images, ready_ids={3})
    scheduling = FakeBackfillScheduling(publish_result=True)
    service = ThumbnailBackfillService(
        cast(Any, repository),
        cast(Any, scheduling),
    )

    result = await service.run(
        batch_size=2,
        from_id=1,
        limit=None,
        dry_run=True,
    )

    assert (result.scanned, result.queued, result.skipped) == (3, 1, 1)
    assert result.unsupported == 1
    assert repository.commits == 0
    assert scheduling.prepared == []


@pytest.mark.asyncio
async def test_backfill_keeps_pending_rows_when_publish_fails() -> None:
    images = [cast(Any, _backfill_image(4, ImageFileTypeEnum.TIFF))]
    repository = FakeBackfillRepository(images, ready_ids=set())
    scheduling = FakeBackfillScheduling(publish_result=False)
    service = ThumbnailBackfillService(
        cast(Any, repository),
        cast(Any, scheduling),
    )

    result = await service.run(
        batch_size=100,
        from_id=4,
        limit=1,
        dry_run=False,
    )

    assert result.failed == 1
    assert result.queued == 0
    assert repository.commits == 1
    assert scheduling.prepared == [4]


def _backfill_image(image_id: int, file_type: ImageFileTypeEnum) -> Any:
    return type(
        "BackfillImage",
        (),
        {
            "id": image_id,
            "file_type": file_type,
            "storage_etag": f"etag-{image_id}",
        },
    )()
