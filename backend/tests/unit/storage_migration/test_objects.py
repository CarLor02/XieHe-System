from __future__ import annotations

import pytest

from scripts.storage_migration.artifacts import MigrationError, load_manifest, save
from scripts.storage_migration.config import Connections
from scripts.storage_migration.object_migration import migrate, verify

from .fakes import FakeS3


def clients(source: FakeS3, target: FakeS3) -> Connections:
    return Connections(
        source.client, target.client, "http://minio:9000", "http://rustfs:9000"
    )


def test_copy_preserves_bytes_metadata_tags_and_empty_buckets_and_can_resume():
    source, target = FakeS3(), FakeS3()
    source.seed(
        "images",
        "uuid/original.png",
        b"original",
        multipart=True,
        Tags={"kind": "medical"},
    )
    source.seed("images", "uuid/thumbnail.webp", b"thumbnail", ContentType="image/webp")
    source.buckets.add("avatars")
    source.policies["avatars"] = '{"Statement": []}'
    connections = clients(source, target)
    first = migrate(connections, None, 1, False, lambda *_: None)
    assert len(first.objects) == 2
    assert sum(o.source.etag != o.destination.etag for o in first.objects) == 1
    assert target.buckets == source.buckets
    assert target.policies == source.policies
    verify(connections, first, full=True)
    uploads = target.uploads
    repeated = migrate(connections, None, 1, False, lambda *_: None)
    assert target.uploads == uploads
    assert repeated.objects == first.objects


def test_changed_destination_requires_explicit_overwrite():
    source, target = FakeS3(), FakeS3()
    source.seed("images", "original", b"new")
    target.seed("images", "original", b"old")
    with pytest.raises(MigrationError, match="--overwrite"):
        migrate(clients(source, target), None, 1, False, lambda *_: None)
    assert target.objects[("images", "original")]["Body"] == b"old"
    manifest = migrate(clients(source, target), None, 1, True, lambda *_: None)
    verify(clients(source, target), manifest, full=True)


def test_source_change_during_copy_does_not_produce_successful_manifest():
    source, target = FakeS3(), FakeS3()
    source.seed("images", "original", b"initial")
    source.change_during_read = True
    with pytest.raises(MigrationError, match="object changed"):
        migrate(clients(source, target), None, 1, False, lambda *_: None)


def test_verify_rejects_a_new_source_object_after_snapshot():
    source, target = FakeS3(), FakeS3()
    source.seed("images", "original", b"initial")
    connections = clients(source, target)
    manifest = migrate(connections, None, 1, False, lambda *_: None)
    source.seed("images", "new", b"another")
    with pytest.raises(MigrationError, match="inventory differs"):
        verify(connections, manifest)


def test_list_and_head_time_precision_does_not_look_like_source_mutation():
    source, target = FakeS3(), FakeS3()
    source.seed("images", "original", b"initial")
    obj = source.objects[("images", "original")]
    obj["LastModified"] = obj["LastModified"].replace(microsecond=123456)
    connections = clients(source, target)
    manifest = migrate(connections, None, 1, False, lambda *_: None)
    verify(connections, manifest, full=True)


def test_evidence_publication_never_overwrites_a_previous_manifest(tmp_path):
    source, target = FakeS3(), FakeS3()
    source.seed("images", "original", b"initial")
    manifest = migrate(clients(source, target), None, 1, False, lambda *_: None)
    path = tmp_path / "manifest.json"
    save(path, manifest)
    assert load_manifest(path) == manifest
    assert path.stat().st_mode & 0o777 == 0o600
    with pytest.raises(FileExistsError):
        save(path, manifest)
    assert load_manifest(path) == manifest
