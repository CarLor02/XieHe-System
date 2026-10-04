from __future__ import annotations

from datetime import datetime

import pytest
from sqlalchemy import create_engine, insert, text, update
from sqlalchemy.engine import Engine

from app.contexts.imaging.domain import build_card_thumbnail_object_key
from scripts.storage_migration import database
from scripts.storage_migration.artifacts import MigrationError
from scripts.storage_migration.database import after_snapshot, mutate, snapshot, tables
from scripts.storage_migration.object_migration import migrate
from scripts.storage_migration.planning import check_storage, plan
from scripts.storage_migration.s3 import inspect

from .fakes import FakeS3
from .test_objects import clients


@pytest.fixture
def engine():
    engine = create_engine("sqlite://")
    statements = [
        """CREATE TABLE image_files (
            id INTEGER PRIMARY KEY, file_uuid VARCHAR(64), file_type VARCHAR(32),
            storage_bucket VARCHAR(128), object_key VARCHAR(500), storage_etag VARCHAR(128),
            file_size BIGINT, mime_type VARCHAR(100), status VARCHAR(32), is_deleted BOOLEAN,
            updated_at DATETIME, annotation TEXT, description TEXT)""",
        """CREATE TABLE image_file_derivatives (
            id INTEGER PRIMARY KEY, image_file_id INTEGER, variant VARCHAR(32),
            source_storage_etag VARCHAR(128), storage_bucket VARCHAR(128), object_key VARCHAR(500),
            storage_etag VARCHAR(128), mime_type VARCHAR(100), width INTEGER, height INTEGER,
            file_size BIGINT, status VARCHAR(16), retry_count INTEGER, last_error TEXT,
            next_retry_at DATETIME, lease_expires_at DATETIME, updated_at DATETIME)""",
        """CREATE TABLE users (
            id INTEGER PRIMARY KEY, avatar_storage_bucket VARCHAR(128), avatar_object_key VARCHAR(500),
            avatar_storage_etag VARCHAR(128), avatar_deleted_at DATETIME, is_deleted BOOLEAN,
            updated_at DATETIME, display_name TEXT)""",
        """CREATE TABLE image_upload_sessions (
            id INTEGER PRIMARY KEY, image_file_id INTEGER, status VARCHAR(32),
            storage_bucket VARCHAR(128), object_key VARCHAR(500), storage_etag VARCHAR(128),
            updated_at DATETIME)""",
    ]
    with engine.begin() as conn:
        for statement in statements:
            conn.execute(text(statement))
    yield engine
    engine.dispose()


def fixture_plan(engine: Engine, *, legacy: bool = False):
    source, target = FakeS3(), FakeS3()
    source.seed("images", "sample/original.png", b"original", multipart=True)
    original = inspect(source.client, "images", "sample/original.png")
    key = (
        "sample/derivatives/card-thumbnail/legacy.webp"
        if legacy
        else build_card_thumbnail_object_key("sample", original.etag)
    )
    source.seed("images", key, b"thumbnail", ContentType="image/webp")
    thumbnail = inspect(source.client, "images", key)
    source.seed("avatars", "avatar.png", b"avatar", multipart=True)
    avatar = inspect(source.client, "avatars", "avatar.png")
    timestamp = datetime(2026, 10, 4, 10, 0)
    with engine.begin() as conn:
        schema = tables(conn)
        conn.execute(
            insert(schema["image_files"]).values(
                id=10,
                file_uuid="sample",
                file_type="PNG",
                storage_bucket="images",
                object_key=original.key,
                storage_etag=original.etag,
                file_size=original.size,
                mime_type="image/png",
                status="PROCESSED",
                is_deleted=False,
                updated_at=timestamp,
                annotation='{"points": [1, 2]}',
                description="keep",
            )
        )
        conn.execute(
            insert(schema["image_file_derivatives"]).values(
                id=20,
                image_file_id=10,
                variant="CARD_THUMBNAIL",
                source_storage_etag=original.etag,
                storage_bucket="images",
                object_key=key,
                storage_etag=thumbnail.etag,
                mime_type="image/webp",
                width=100,
                height=200,
                file_size=thumbnail.size,
                status="READY",
                retry_count=0,
                updated_at=timestamp,
            )
        )
        conn.execute(
            insert(schema["users"]).values(
                id=7,
                avatar_storage_bucket="avatars",
                avatar_object_key=avatar.key,
                avatar_storage_etag=avatar.etag,
                is_deleted=False,
                updated_at=timestamp,
                display_name="keep",
            )
        )
        conn.execute(
            insert(schema["image_upload_sessions"]).values(
                id=30,
                image_file_id=10,
                status="COMPLETED",
                storage_bucket="images",
                object_key=original.key,
                storage_etag=original.etag,
                updated_at=timestamp,
            )
        )
    connections = clients(source, target)
    manifest = migrate(connections, None, 1, False, lambda *_: None)
    return plan(engine, manifest, connections), connections, source, target, manifest


def read(engine: Engine):
    with engine.connect() as conn:
        return snapshot(conn, tables(conn))


def test_plan_prepares_current_thumbnail_without_database_writes_and_roundtrips(engine):
    document, connections, source, target, _ = fixture_plan(engine)
    assert read(engine) == document.snapshot
    assert len(document.prepared_objects) == 1
    assert not document.legacy_thumbnail_ids
    old_key = source.objects.keys()
    assert ("images", document.prepared_objects[0].key) in target.objects
    assert ("images", document.prepared_objects[0].key) not in old_key

    def preflight():
        check_storage(connections, document, reverse=False)

    assert mutate(engine, document, reverse=False, preflight=preflight) == "applied"
    assert read(engine) == after_snapshot(document)
    assert (
        mutate(engine, document, reverse=False, preflight=preflight)
        == "already applied"
    )
    with engine.connect() as conn:
        assert (
            conn.execute(text("SELECT annotation FROM image_files")).scalar_one()
            == '{"points": [1, 2]}'
        )
        assert (
            conn.execute(text("SELECT display_name FROM users")).scalar_one() == "keep"
        )
        original_session = next(
            r for r in document.snapshot if r.table == "image_upload_sessions"
        )
        assert (
            conn.execute(
                text("SELECT storage_etag FROM image_upload_sessions")
            ).scalar_one()
            == original_session.values["storage_etag"]
        )

    def rollback_check():
        check_storage(connections, document, reverse=True)

    assert (
        mutate(engine, document, reverse=True, preflight=rollback_check)
        == "rolled back"
    )
    assert read(engine) == document.snapshot
    assert (
        mutate(engine, document, reverse=True, preflight=rollback_check)
        == "already rolled back"
    )


def test_legacy_thumbnail_keeps_its_renderer_identity(engine):
    document, *_ = fixture_plan(engine, legacy=True)
    assert document.legacy_thumbnail_ids == [20]
    assert not document.prepared_objects
    change = next(c for c in document.changes if c.table == "image_file_derivatives")
    assert change.before["object_key"] == change.after["object_key"]
    assert change.before["source_storage_etag"] != change.after["source_storage_etag"]


def test_failed_thumbnail_without_an_object_keeps_its_failure_state(engine):
    _, connections, _, _, manifest = fixture_plan(engine)
    with engine.begin() as conn:
        schema = tables(conn)
        conn.execute(
            update(schema["image_file_derivatives"]).values(
                status="FAILED", object_key=None, storage_etag=None
            )
        )
    document = plan(engine, manifest, connections)
    change = next(c for c in document.changes if c.table == "image_file_derivatives")
    assert change.after["status"] == "FAILED"
    assert change.after["object_key"] is None
    assert change.before["source_storage_etag"] != change.after["source_storage_etag"]
    mutate(
        engine,
        document,
        reverse=False,
        preflight=lambda: check_storage(connections, document, reverse=False),
    )


def test_apply_conflict_does_not_commit_other_changes(engine):
    document, *_ = fixture_plan(engine)
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE users SET avatar_storage_etag='user-change' WHERE id=7")
        )
    before = read(engine)
    with pytest.raises(MigrationError, match="database changed"):
        mutate(engine, document, reverse=False, preflight=lambda: None)
    assert read(engine) == before


def test_failure_after_a_write_rolls_back_the_whole_transaction(engine, monkeypatch):
    document, *_ = fixture_plan(engine)
    original_update = database.update_record
    calls = 0

    def fail_later(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 2:
            raise MigrationError("injected storage migration failure")
        original_update(*args, **kwargs)

    monkeypatch.setattr(database, "update_record", fail_later)
    with pytest.raises(MigrationError, match="injected"):
        mutate(engine, document, reverse=False, preflight=lambda: None)
    assert read(engine) == document.snapshot


def test_rollback_refuses_changes_made_after_cutover(engine):
    document, *_ = fixture_plan(engine)
    mutate(engine, document, reverse=False, preflight=lambda: None)
    with engine.begin() as conn:
        conn.execute(
            text("UPDATE image_files SET storage_etag='new-user-upload' WHERE id=10")
        )
    before = read(engine)
    with pytest.raises(MigrationError, match="database changed"):
        mutate(engine, document, reverse=True, preflight=lambda: None)
    assert read(engine) == before


def test_new_record_after_plan_is_a_conflict(engine):
    document, *_ = fixture_plan(engine)
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO users(id, is_deleted) VALUES(99, 0)"))
    with pytest.raises(MigrationError, match="users/99"):
        mutate(engine, document, reverse=False, preflight=lambda: None)


def test_modified_plan_cannot_change_business_fields(engine):
    document, *_ = fixture_plan(engine)
    document.changes[0].after["status"] = "FAILED"
    with pytest.raises(MigrationError, match="outside storage"):
        mutate(engine, document, reverse=False, preflight=lambda: None)
    assert read(engine) == document.snapshot


def test_modified_plan_cannot_invent_a_destination_etag(engine):
    document, *_ = fixture_plan(engine)
    document.changes[0].after["storage_etag"] = "not-in-verified-manifest"
    with pytest.raises(MigrationError, match="not verified destination"):
        mutate(engine, document, reverse=False, preflight=lambda: None)
    assert read(engine) == document.snapshot


def test_planning_refuses_unfinished_uploads(engine):
    document, connections, _, _, manifest = fixture_plan(engine)
    with engine.begin() as conn:
        schema = tables(conn)
        conn.execute(
            update(schema["image_upload_sessions"]).values(status="COMPLETING")
        )
    before = read(engine)
    with pytest.raises(MigrationError, match="unfinished upload session"):
        plan(engine, manifest, connections)
    assert read(engine) == before
    assert document.changes


def test_missing_minio_object_prevents_rollback(engine):
    document, connections, source, _, _ = fixture_plan(engine)
    mutate(engine, document, reverse=False, preflight=lambda: None)
    del source.objects[("images", "sample/original.png")]
    before = read(engine)
    with pytest.raises(Exception):
        mutate(
            engine,
            document,
            reverse=True,
            preflight=lambda: check_storage(connections, document, reverse=True),
        )
    assert read(engine) == before
