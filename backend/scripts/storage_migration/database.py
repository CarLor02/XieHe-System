"""Storage-only snapshots and atomic, guarded updates using SQLAlchemy Core."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Callable

from sqlalchemy import DateTime, MetaData, Table, select, update
from sqlalchemy.engine import Connection, Engine
from sqlalchemy.exc import NoSuchTableError

from .artifacts import Change, MigrationError, Plan, Record, TableName

COLUMNS: dict[TableName, tuple[str, ...]] = {
    "image_files": (
        "file_uuid",
        "file_type",
        "storage_bucket",
        "object_key",
        "storage_etag",
        "file_size",
        "mime_type",
        "status",
        "is_deleted",
        "updated_at",
    ),
    "image_file_derivatives": (
        "image_file_id",
        "variant",
        "source_storage_etag",
        "storage_bucket",
        "object_key",
        "storage_etag",
        "mime_type",
        "width",
        "height",
        "file_size",
        "status",
        "retry_count",
        "last_error",
        "next_retry_at",
        "lease_expires_at",
        "updated_at",
    ),
    "users": (
        "avatar_storage_bucket",
        "avatar_object_key",
        "avatar_storage_etag",
        "avatar_deleted_at",
        "is_deleted",
        "updated_at",
    ),
    "image_upload_sessions": (
        "image_file_id",
        "status",
        "storage_bucket",
        "object_key",
        "storage_etag",
        "updated_at",
    ),
}
WRITABLE: dict[TableName, set[str]] = {
    "image_files": {"storage_etag"},
    "image_file_derivatives": {"source_storage_etag", "object_key", "storage_etag"},
    "users": {"avatar_storage_etag"},
    # Completed upload ETags are historical evidence, not the current object version.
    "image_upload_sessions": set(),
}


def tables(connection: Connection) -> dict[TableName, Table]:
    metadata = MetaData()
    result = {}
    for name, columns in COLUMNS.items():
        try:
            table = Table(name, metadata, autoload_with=connection, resolve_fks=False)
        except NoSuchTableError as exc:
            raise MigrationError(
                f"required table missing: {name}; confirm database migrations before planning"
            ) from exc
        if not {"id", *columns} <= set(table.c.keys()):
            raise MigrationError(f"database schema is missing storage columns: {name}")
        result[name] = table
    return result


def snapshot(
    connection: Connection, schema: dict[TableName, Table], *, lock: bool = False
) -> list[Record]:
    result = []
    for name, columns in COLUMNS.items():
        table = schema[name]
        statement = select(table.c.id, *(table.c[c] for c in columns)).order_by(
            table.c.id
        )
        if lock:
            statement = statement.with_for_update()
        for row in connection.execute(statement).mappings():
            values = {
                c: row[c].isoformat() if isinstance(row[c], datetime) else row[c]
                for c in columns
            }
            result.append(Record(table=name, id=int(row["id"]), values=values))
    return result


def validate_plan(plan: Plan) -> None:
    records = {(r.table, r.id): r for r in plan.snapshot}
    if len(records) != len(plan.snapshot):
        raise MigrationError("duplicate record in database snapshot")
    for record in plan.snapshot:
        if set(record.values) != set(COLUMNS[record.table]):
            raise MigrationError(
                "plan snapshot fields do not match the supported schema"
            )
    seen = set()
    for change in plan.changes:
        ref = (change.table, change.id)
        if ref in seen or ref not in records or change.before != records[ref].values:
            raise MigrationError("change does not match its original database snapshot")
        seen.add(ref)
        if set(change.before) != set(change.after):
            raise MigrationError("change has inconsistent fields")
        changed = {
            key for key in change.before if change.before[key] != change.after[key]
        }
        if not changed or not changed <= WRITABLE[change.table]:
            raise MigrationError(
                "plan attempts to modify a field outside storage migration"
            )
        validate_change_evidence(plan, change)


def validate_change_evidence(plan: Plan, change: Change) -> None:
    """Every new reference/ETag must come from the verified destination evidence."""
    states = {
        (obj.destination.bucket, obj.destination.key): obj.destination
        for obj in plan.evidence
    }
    states.update({(obj.bucket, obj.key): obj for obj in plan.prepared_objects})
    bucket_field, key_field, etag_field = (
        ("avatar_storage_bucket", "avatar_object_key", "avatar_storage_etag")
        if change.table == "users"
        else ("storage_bucket", "object_key", "storage_etag")
    )
    own_reference_changed = any(
        change.before[name] != change.after[name] for name in [key_field, etag_field]
    )
    if change.table != "image_file_derivatives" or own_reference_changed:
        state = states.get((change.after[bucket_field], change.after[key_field]))
        if state is None or change.after[etag_field] != state.etag:
            raise MigrationError(
                "planned ETag/reference is not verified destination evidence"
            )
    if (
        change.table == "image_file_derivatives"
        and change.before["source_storage_etag"] != change.after["source_storage_etag"]
    ):
        image = next(
            (
                r
                for r in plan.snapshot
                if r.table == "image_files" and r.id == change.after["image_file_id"]
            ),
            None,
        )
        parent = (
            None
            if image is None
            else states.get(
                (image.values["storage_bucket"], image.values["object_key"])
            )
        )
        if parent is None or parent.etag != change.after["source_storage_etag"]:
            raise MigrationError(
                "thumbnail source ETag is not verified original evidence"
            )


def after_snapshot(plan: Plan) -> list[Record]:
    changes = {(c.table, c.id): c.after for c in plan.changes}
    return [
        Record(table=r.table, id=r.id, values=changes.get((r.table, r.id), r.values))
        for r in plan.snapshot
    ]


def conflict(current: list[Record], expected: list[Record]) -> str:
    actual = {(r.table, r.id): r.values for r in current}
    wanted = {(r.table, r.id): r.values for r in expected}
    changed = [
        f"{name}/{identity}"
        for name, identity in sorted(set(actual) | set(wanted))
        if actual.get((name, identity)) != wanted.get((name, identity))
    ]
    return ", ".join(changed[:10])


def sql_values(table: Table, values: dict[str, Any]) -> dict[str, Any]:
    return {
        name: datetime.fromisoformat(value)
        if value is not None and isinstance(table.c[name].type, DateTime)
        else value
        for name, value in values.items()
    }


def update_record(
    connection: Connection, table: Table, change: Change, *, reverse: bool
) -> None:
    before, after = (
        (change.after, change.before) if reverse else (change.before, change.after)
    )
    statement = update(table).where(table.c.id == change.id)
    for name, value in sql_values(table, before).items():
        statement = statement.where(table.c[name] == value)
    writes = {
        name: value
        for name, value in sql_values(table, after).items()
        if before[name] != after[name]
    }
    # Preserve business timestamps even on installations with MySQL ON UPDATE.
    writes["updated_at"] = sql_values(table, before)["updated_at"]
    if connection.execute(statement.values(**writes)).rowcount != 1:
        raise MigrationError(f"concurrent update rejected: {change.table}/{change.id}")


def mutate(
    engine: Engine, plan: Plan, *, reverse: bool, preflight: Callable[[], None]
) -> str:
    validate_plan(plan)
    old, new = plan.snapshot, after_snapshot(plan)
    expected, desired = (new, old) if reverse else (old, new)
    # Lock and validate every guarded row before the first write. Any conflict or
    # S3 failure aborts the whole transaction; unrelated business fields stay intact.
    with engine.begin() as connection:
        schema = tables(connection)
        current = snapshot(connection, schema, lock=True)
        if current == desired:
            preflight()
            return "already rolled back" if reverse else "already applied"
        if current != expected:
            raise MigrationError(
                f"database changed since plan; no updates committed: {conflict(current, expected)}"
            )
        preflight()
        for change in plan.changes:
            update_record(connection, schema[change.table], change, reverse=reverse)
        if snapshot(connection, schema) != desired:
            raise MigrationError(
                "post-update snapshot differs; transaction rolled back"
            )
    return "rolled back" if reverse else "applied"
