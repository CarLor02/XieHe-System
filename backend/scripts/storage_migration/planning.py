"""Prepare reversible ETag changes and compatible thumbnail object references."""

from __future__ import annotations

from typing import Any

from sqlalchemy.engine import Engine

from app.contexts.imaging.domain import (
    build_card_thumbnail_object_key,
    is_current_card_thumbnail_object_key,
    normalize_storage_etag,
)

from .artifacts import (
    Change,
    Manifest,
    MigrationError,
    ObjectEvidence,
    Plan,
    Record,
    fingerprint,
    now,
)
from .config import Connections, database_identity
from .database import snapshot, tables, validate_plan
from .object_migration import verify
from .s3 import assert_state, copy_object, listing


class Planner:
    def __init__(
        self, records: list[Record], manifest: Manifest, clients: Connections
    ) -> None:
        self.records = records
        self.clients = clients
        self.objects = {(o.source.bucket, o.source.key): o for o in manifest.objects}
        self.images = {r.id: r for r in records if r.table == "image_files"}
        self.changes: list[Change] = []
        self.prepared: list[ObjectEvidence] = []
        self.legacy: list[int] = []

    def object(
        self, row: Record, bucket: Any, key: Any, *, optional: bool = False
    ) -> ObjectEvidence | None:
        evidence = self.objects.get((bucket, key))
        if evidence is None and not optional:
            raise MigrationError(
                f"database object is absent from manifest: {row.table}/{row.id}"
            )
        return evidence

    def change(self, row: Record, **writes: Any) -> None:
        values = row.values | writes
        if values != row.values:
            self.changes.append(
                Change(table=row.table, id=row.id, before=row.values, after=values)
            )

    def image(self, row: Record) -> None:
        values = row.values
        if values["status"] == "UPLOADING" and not values["is_deleted"]:
            raise MigrationError(f"unfinished image upload: {row.id}")
        evidence = self.object(
            row,
            values["storage_bucket"],
            values["object_key"],
            optional=bool(values["is_deleted"]) or values["status"] == "FAILED",
        )
        if evidence is None:
            return
        if values["file_size"] != evidence.source.size:
            raise MigrationError(f"image size differs from verified object: {row.id}")
        old = normalize_storage_etag(values["storage_etag"])
        if old is not None and old != evidence.source.etag:
            raise MigrationError(
                f"database ETag does not match MinIO: image_files/{row.id}"
            )
        self.change(row, storage_etag=evidence.destination.etag)

    def avatar(self, row: Record) -> None:
        values = row.values
        if not values["avatar_object_key"]:
            return
        evidence = self.object(
            row,
            values["avatar_storage_bucket"],
            values["avatar_object_key"],
            optional=bool(values["is_deleted"] or values["avatar_deleted_at"]),
        )
        if evidence is None:
            return
        old = normalize_storage_etag(values["avatar_storage_etag"])
        if old is not None and old != evidence.source.etag:
            raise MigrationError(f"database ETag does not match MinIO: users/{row.id}")
        self.change(row, avatar_storage_etag=evidence.destination.etag)

    def derivative(self, row: Record) -> None:
        values = row.values
        if values["status"] in {"PENDING", "PROCESSING"}:
            raise MigrationError(
                f"unfinished thumbnail task: {row.id}; drain tasks before final plan"
            )
        image = self.images.get(values["image_file_id"])
        if image is None:
            raise MigrationError(f"thumbnail has no parent image: {row.id}")
        original = self.objects.get(
            (image.values["storage_bucket"], image.values["object_key"])
        )
        if original is None:
            if image.values["is_deleted"]:
                return
            raise MigrationError(f"thumbnail parent object missing: {row.id}")
        writes: dict[str, Any] = {}
        old_source = normalize_storage_etag(values["source_storage_etag"])
        if old_source == original.source.etag:
            writes["source_storage_etag"] = original.destination.etag
        elif values["status"] == "READY":
            raise MigrationError(
                f"READY thumbnail does not belong to current MinIO original: {row.id}"
            )
        if values["object_key"]:
            evidence = self.object(
                row,
                values["storage_bucket"],
                values["object_key"],
                optional=bool(image.values["is_deleted"])
                or values["status"] != "READY",
            )
            if evidence:
                writes.update(self.thumbnail_fields(row, image, original, evidence))
        elif values["status"] == "READY":
            raise MigrationError(f"READY thumbnail has no object reference: {row.id}")
        self.change(row, **writes)

    def thumbnail_fields(
        self,
        row: Record,
        image: Record,
        original: ObjectEvidence,
        evidence: ObjectEvidence,
    ) -> dict[str, Any]:
        values = row.values
        old = normalize_storage_etag(values["storage_etag"])
        if old is not None and old != evidence.source.etag:
            raise MigrationError(f"thumbnail ETag differs from MinIO: {row.id}")
        writes = {"storage_etag": evidence.destination.etag}
        if values["status"] != "READY" or values["variant"] != "CARD_THUMBNAIL":
            return writes
        current = is_current_card_thumbnail_object_key(
            file_uuid=image.values["file_uuid"],
            source_etag=original.source.etag,
            object_key=values["object_key"],
        )
        if not current:
            # Never label bytes from a legacy renderer as v2. They remain viewable
            # at their copied key; the existing backfill can upgrade them later.
            self.legacy.append(row.id)
            return writes
        new_key = build_card_thumbnail_object_key(
            image.values["file_uuid"], original.destination.etag
        )
        if new_key != values["object_key"]:
            prepared = copy_object(
                self.clients.source,
                self.clients.destination,
                evidence.source,
                key=new_key,
            )
            self.prepared.append(prepared)
            writes.update(object_key=new_key, storage_etag=prepared.destination.etag)
        return writes


def plan(engine: Engine, manifest: Manifest, clients: Connections) -> Plan:
    verify(clients, manifest)
    with engine.connect() as connection:
        records = snapshot(connection, tables(connection))
    builder = Planner(records, manifest, clients)
    for record in records:
        if record.table == "image_files":
            builder.image(record)
        elif record.table == "users":
            builder.avatar(record)
        elif record.table == "image_file_derivatives":
            builder.derivative(record)
        elif record.values["status"] in {"INITIALIZING", "READY", "COMPLETING"}:
            raise MigrationError(f"unfinished upload session: {record.id}")
    verify(clients, manifest)
    result = Plan(
        created_at=now(),
        database=database_identity(engine),
        source_endpoint=manifest.source_endpoint,
        destination_endpoint=manifest.destination_endpoint,
        manifest_sha256=fingerprint(manifest.model_dump(mode="json")),
        snapshot=records,
        changes=builder.changes,
        evidence=manifest.objects,
        prepared_objects=[o.destination for o in builder.prepared],
        buckets=manifest.buckets,
        legacy_thumbnail_ids=builder.legacy,
    )
    validate_plan(result)
    return result


def check_storage(clients: Connections, plan: Plan, *, reverse: bool) -> None:
    if not reverse:
        expected = {
            (obj.source.bucket, obj.source.key): (
                obj.source.size,
                obj.source.etag,
                obj.source.last_modified,
            )
            for obj in plan.evidence
        }
        if listing(clients.source, plan.buckets) != expected:
            raise MigrationError(
                "source inventory changed since plan; copy and plan again"
            )
    for evidence in plan.evidence:
        assert_state(clients.source, evidence.source)
        if not reverse:
            assert_state(clients.destination, evidence.destination)
    if not reverse:
        for state in plan.prepared_objects:
            assert_state(clients.destination, state)
