from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from threading import Barrier, Lock
from typing import cast

import pytest
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.contexts.access_control.infrastructure.persistence.models import User
from app.contexts.imaging.application.ports import ImageFileRecord
from app.contexts.imaging.domain import (
    ImageDerivativeStatus,
    ImageDerivativeVariant,
    ImageFileStatusEnum,
    ImageFileTypeEnum,
)
from app.contexts.imaging.infrastructure.persistence import (
    ImageFile,
    ImageFileDerivative,
)
from app.contexts.imaging.infrastructure.persistence.repositories import (
    SqlAlchemyThumbnailSchedulingRepository,
)

pytestmark = pytest.mark.database


def test_concurrent_new_derivatives_use_atomic_upsert_without_gap_locks(
    test_engine: Engine,
    test_session_factory: sessionmaker,
) -> None:
    image_ids = list(range(1201, 1207))
    with test_session_factory() as setup:
        setup.add(_owner())
        setup.add_all([_image(image_id) for image_id in image_ids])
        setup.commit()

    statements: list[str] = []
    statements_lock = Lock()

    def capture_statement(
        _connection: object,
        _cursor: object,
        statement: str,
        _parameters: object,
        _context: object,
        _executemany: bool,
    ) -> None:
        if "image_file_derivatives" not in statement:
            return
        with statements_lock:
            statements.append(statement.upper())

    event.listen(test_engine, "before_cursor_execute", capture_statement)
    start = Barrier(len(image_ids))
    try:
        with ThreadPoolExecutor(max_workers=len(image_ids)) as executor:
            futures = [
                executor.submit(
                    _schedule_thumbnail,
                    test_session_factory,
                    image_id,
                    start,
                )
                for image_id in image_ids
            ]
            for future in futures:
                future.result(timeout=10)
    finally:
        event.remove(test_engine, "before_cursor_execute", capture_statement)

    with test_session_factory() as verification:
        derivatives = (
            verification.query(ImageFileDerivative)
            .filter(ImageFileDerivative.image_file_id.in_(image_ids))
            .all()
        )

    assert {item.image_file_id for item in derivatives} == set(image_ids)
    assert any("ON DUPLICATE KEY UPDATE" in statement for statement in statements)
    assert not any("FOR UPDATE" in statement for statement in statements)


def test_atomic_upsert_preserves_ready_object_until_source_version_changes(
    test_session_factory: sessionmaker,
) -> None:
    with test_session_factory() as setup:
        image = _image(1201)
        setup.add_all([_owner(), image])
        setup.flush()
        setup.add(
            ImageFileDerivative(
                image_file_id=image.id,
                variant=ImageDerivativeVariant.CARD_THUMBNAIL.value,
                source_storage_etag="etag-1201",
                storage_bucket="medical-image-files",
                object_key="old-thumbnail.webp",
                storage_etag="old-thumbnail-etag",
                mime_type="image/webp",
                width=320,
                height=480,
                file_size=100,
                status=ImageDerivativeStatus.READY.value,
                retry_count=0,
            )
        )
        setup.commit()

    with test_session_factory() as session:
        image = session.get(ImageFile, 1201)
        assert image is not None
        repository = SqlAlchemyThumbnailSchedulingRepository(session)

        assert repository.upsert_pending(cast(ImageFileRecord, image)) is None
        repository.commit()

        image.storage_etag = "etag-1201-v2"
        derivative = repository.upsert_pending(cast(ImageFileRecord, image))
        assert derivative is not None
        assert derivative.source_storage_etag == "etag-1201-v2"
        assert derivative.status == ImageDerivativeStatus.PENDING.value
        assert derivative.object_key == "old-thumbnail.webp"
        repository.commit()


def _schedule_thumbnail(
    session_factory: sessionmaker,
    image_id: int,
    start: Barrier,
) -> None:
    session: Session = session_factory()
    try:
        image = session.get(ImageFile, image_id)
        assert image is not None
        start.wait(timeout=5)
        repository = SqlAlchemyThumbnailSchedulingRepository(session)
        derivative = repository.upsert_pending(cast(ImageFileRecord, image))
        assert derivative is not None
        repository.commit()
    finally:
        session.rollback()
        session.close()


def _image(image_id: int) -> ImageFile:
    return ImageFile(
        id=image_id,
        file_uuid=f"thumbnail-concurrency-{image_id}",
        original_filename=f"image-{image_id}.png",
        file_type=ImageFileTypeEnum.PNG,
        mime_type="image/png",
        storage_bucket="medical-image-files",
        object_key=f"objects/image-{image_id}.png",
        storage_etag=f"etag-{image_id}",
        file_size=1024,
        uploaded_by=1200,
        status=ImageFileStatusEnum.UPLOADED,
        upload_progress=100,
        is_deleted=False,
    )


def _owner() -> User:
    return User(
        id=1200,
        username="thumbnail-concurrency-owner",
        email="thumbnail-concurrency@example.com",
        password_hash="hash",
        salt="salt",
        real_name="缩略图并发测试",
        status="active",
    )
