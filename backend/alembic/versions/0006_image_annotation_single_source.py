"""make image_files the annotation source of truth

Revision ID: 0006_annotation_single_source
Revises: 0005_image_import_pipeline
Create Date: 2026-08-02 00:00:00
"""

from __future__ import annotations

import hashlib
import json
import re
from collections import defaultdict
from datetime import datetime
from typing import Any

import sqlalchemy as sa

from alembic import op

revision = "0006_annotation_single_source"
down_revision = "0005_image_import_pipeline"
branch_labels = None
depends_on = None

_VERTEBRA_LABEL = re.compile(r"^(?:C|T|L)\d+$")
_NUMBERED_KEYPOINT_LABEL = re.compile(r"^.+-\d+$")
_AUDIT_ITEM_ID_MAX_LENGTH = 128


def _audit_item_id(value: object) -> str:
    """Mirror the runtime audit identity limit for historical payloads."""

    item_id = str(value)
    if len(item_id) <= _AUDIT_ITEM_ID_MAX_LENGTH:
        return item_id
    return f"sha256:{hashlib.sha256(item_id.encode('utf-8')).hexdigest()}"


def _has_content(annotation: dict[str, Any]) -> bool:
    return bool(
        annotation.get("measurements")
        or annotation.get("vertebraeLayer")
        or annotation.get("cfhAnnotation")
        or (
            annotation.get("standardDistance") is not None
            and annotation.get("standardDistancePoints")
        )
    )


def _baseline_measurements(
    annotation: dict[str, Any],
) -> dict[tuple[str, str], dict[str, Any]]:
    items: dict[tuple[str, str], dict[str, Any]] = {}
    measurements = annotation.get("measurements")
    if isinstance(measurements, list):
        for index, measurement in enumerate(measurements):
            if not isinstance(measurement, dict):
                continue
            item_id = _audit_item_id(measurement.get("id") or f"legacy-{index}")
            items[("MEASUREMENT", item_id)] = measurement
    return items


def _baseline_keypoints(
    annotation: dict[str, Any],
) -> dict[tuple[str, str], dict[str, Any]]:
    items: dict[tuple[str, str], dict[str, Any]] = {}

    layer = annotation.get("vertebraeLayer")
    if isinstance(layer, list):
        for entry in layer:
            if not isinstance(entry, dict):
                continue
            label = entry.get("label")
            corners = entry.get("corners")
            if (
                not isinstance(label, str)
                or not isinstance(corners, list)
                or not corners
            ):
                continue
            point_payload = {
                field: entry[field]
                for field in ("source", "confidence")
                if field in entry
            }
            if _NUMBERED_KEYPOINT_LABEL.match(label) or not (
                _VERTEBRA_LABEL.match(label) or label == "S1"
            ):
                items[("KEYPOINT", _audit_item_id(label))] = {
                    **point_payload,
                    "point": corners[0],
                }
                continue
            point_count = min(len(corners), 2 if label == "S1" else 4)
            for index in range(point_count):
                item_id = f"{label}-{index + 1}"
                items[("KEYPOINT", item_id)] = {
                    **point_payload,
                    "point": corners[index],
                }

    cfh = annotation.get("cfhAnnotation")
    if isinstance(cfh, dict) and "center" in cfh:
        items[("KEYPOINT", "CFH")] = {
            "point": cfh["center"],
            **{field: cfh[field] for field in ("source", "confidence") if field in cfh},
        }
    return items


def _baseline_items(annotation: dict[str, Any]) -> list[dict[str, Any]]:
    items = {**_baseline_measurements(annotation), **_baseline_keypoints(annotation)}

    points = annotation.get("standardDistancePoints")
    if (
        annotation.get("standardDistance") is not None
        and isinstance(points, list)
        and points
    ):
        items[("CALIBRATION", "standard-distance")] = {
            "distance": annotation["standardDistance"],
            "points": points,
        }

    return [
        {"item_kind": kind, "item_id": item_id, "payload": payload}
        for (kind, item_id), payload in items.items()
    ]


def _coerce_json(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else None
    return None


def _legacy_audit(bind: sa.Connection) -> dict[int, dict[str, Any]]:
    inspector = sa.inspect(bind)
    if "image_annotations" not in inspector.get_table_names():
        return {}

    rows = bind.execute(
        sa.text(
            """
            SELECT image_file_id, created_at, created_by, updated_at, updated_by
            FROM image_annotations
            ORDER BY image_file_id, created_at, id
            """
        )
    ).mappings()
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        grouped[int(row["image_file_id"])].append(dict(row))

    result: dict[int, dict[str, Any]] = {}
    for image_file_id, annotation_rows in grouped.items():
        first = annotation_rows[0]
        latest = max(
            annotation_rows,
            key=lambda item: (
                item.get("updated_at") or item.get("created_at") or datetime.min
            ),
        )
        result[image_file_id] = {
            "created_at": first.get("created_at"),
            "created_by": first.get("created_by"),
            "updated_at": latest.get("updated_at") or latest.get("created_at"),
            "updated_by": latest.get("updated_by") or latest.get("created_by"),
        }
    return result


def _legacy_snapshots(bind: sa.Connection) -> dict[int, dict[str, Any]]:
    inspector = sa.inspect(bind)
    if "image_annotations" not in inspector.get_table_names():
        return {}
    rows = bind.execute(
        sa.text(
            """
            SELECT id, image_file_id, coordinates, label, description,
                   measurement_value, measurement_unit, created_at
            FROM image_annotations
            WHERE is_deleted = 0 OR is_deleted IS NULL
            ORDER BY image_file_id, id
            """
        )
    ).mappings()
    grouped: dict[int, list[dict[str, Any]]] = defaultdict(list)
    for row in rows:
        coordinates = row["coordinates"]
        if isinstance(coordinates, str):
            coordinates = json.loads(coordinates)
        value = row["measurement_value"]
        unit = row["measurement_unit"] or ""
        grouped[int(row["image_file_id"])].append(
            {
                "id": f"legacy-{row['id']}",
                "type": row["label"] or row["description"] or "measurement",
                "description": row["description"],
                "value": f"{value}{unit}" if value is not None else "",
                "points": [
                    {"x": float(point[0]), "y": float(point[1])}
                    for point in (coordinates or [])
                    if isinstance(point, (list, tuple)) and len(point) >= 2
                ],
            }
        )
    return {
        image_file_id: {
            "schemaVersion": 1,
            "measurements": measurements,
            "pointBindings": {"syncGroups": []},
            "vertebraeLayer": [],
        }
        for image_file_id, measurements in grouped.items()
    }


def _backfill(bind: sa.Connection) -> None:
    legacy_audit = _legacy_audit(bind)
    legacy_snapshots = _legacy_snapshots(bind)
    valid_user_ids = {
        int(user_id) for (user_id,) in bind.execute(sa.text("SELECT id FROM users"))
    }
    revision_table = sa.table(
        "image_annotation_revisions",
        sa.column("id", sa.BigInteger),
        sa.column("image_file_id", sa.Integer),
        sa.column("version", sa.BigInteger),
        sa.column("snapshot", sa.JSON),
        sa.column("source", sa.String),
        sa.column("reason", sa.String),
        sa.column("actor_id", sa.Integer),
        sa.column("created_at", sa.DateTime),
    )
    event_table = sa.table(
        "image_annotation_item_events",
        sa.column("revision_id", sa.BigInteger),
        sa.column("image_file_id", sa.Integer),
        sa.column("item_kind", sa.String),
        sa.column("item_id", sa.String),
        sa.column("action", sa.String),
        sa.column("before_payload", sa.JSON),
        sa.column("after_payload", sa.JSON),
        sa.column("created_at", sa.DateTime),
    )
    existing_baselines = {
        int(image_file_id)
        for (image_file_id,) in bind.execute(
            sa.text(
                """
                SELECT image_file_id
                FROM image_annotation_revisions
                WHERE version = 1
                """
            )
        )
    }

    images = bind.execute(
        sa.text(
            """
            SELECT id, annotation, patient_id, description, created_at, updated_at
            FROM image_files
            ORDER BY id
            """
        )
    ).mappings()
    for image in images:
        annotation = _coerce_json(image["annotation"]) or legacy_snapshots.get(
            int(image["id"])
        )
        if annotation is None:
            # 历史 MySQL JSON null 在 SQL 层仍满足 IS NOT NULL，统一转为真正的 NULL。
            bind.execute(
                sa.text(
                    """
                    UPDATE image_files
                    SET annotation = NULL,
                        annotation_version = 0,
                        has_annotation = 0
                    WHERE id = :image_file_id
                    """
                ),
                {"image_file_id": int(image["id"])},
            )
            continue
        annotation = dict(annotation)
        image_file_id = int(image["id"])
        audit = legacy_audit.get(image_file_id, {})
        created_at = (
            audit.get("created_at") or image.get("updated_at") or image["created_at"]
        )
        updated_at = audit.get("updated_at") or image.get("updated_at") or created_at
        raw_created_by = audit.get("created_by")
        created_by = (
            int(raw_created_by)
            if raw_created_by is not None and int(raw_created_by) in valid_user_ids
            else None
        )
        raw_updated_by = audit.get("updated_by") or created_by
        updated_by = (
            int(raw_updated_by)
            if raw_updated_by is not None and int(raw_updated_by) in valid_user_ids
            else None
        )
        has_content = _has_content(annotation)
        if image["annotation"] is None:
            annotation.update(
                {
                    "imageId": str(image_file_id),
                    "patientId": image["patient_id"],
                    "examType": image["description"],
                    "savedAt": updated_at.isoformat() if updated_at else None,
                }
            )
        annotation.setdefault("schemaVersion", 1)
        annotation.setdefault("savedAt", updated_at.isoformat() if updated_at else None)
        annotation.setdefault("measurements", [])
        annotation.setdefault("pointBindings", {"syncGroups": []})
        annotation.setdefault("vertebraeLayer", [])

        bind.execute(
            sa.text(
                """
                UPDATE image_files
                SET annotation_version = 1,
                    annotation = :annotation,
                    has_annotation = :has_annotation,
                    annotation_created_at = :created_at,
                    annotation_created_by = :created_by,
                    annotation_updated_at = :updated_at,
                    annotation_updated_by = :updated_by,
                    status = :status
                WHERE id = :image_file_id
                """
            ),
            {
                "has_annotation": has_content,
                "annotation": json.dumps(annotation, ensure_ascii=False),
                "created_at": created_at,
                "created_by": created_by,
                "updated_at": updated_at,
                "updated_by": updated_by,
                "status": "PROCESSED" if has_content else "UPLOADED",
                "image_file_id": image_file_id,
            },
        )
        if image_file_id in existing_baselines:
            continue
        result = bind.execute(
            revision_table.insert().values(
                image_file_id=image_file_id,
                version=1,
                snapshot=annotation,
                source="MIGRATION",
                reason="BASELINE",
                actor_id=updated_by,
                created_at=updated_at,
            )
        )
        if result.lastrowid is None:
            raise RuntimeError("无法获取标注基线 revision ID")
        revision_id = int(result.lastrowid)
        baseline_items = _baseline_items(annotation)
        if baseline_items:
            bind.execute(
                event_table.insert(),
                [
                    {
                        "revision_id": revision_id,
                        "image_file_id": image_file_id,
                        "item_kind": item["item_kind"],
                        "item_id": item["item_id"],
                        "action": "BASELINE",
                        "before_payload": None,
                        "after_payload": item["payload"],
                        "created_at": updated_at,
                    }
                    for item in baseline_items
                ],
            )


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("image_files")}

    if "annotation_version" not in columns:
        op.add_column(
            "image_files",
            sa.Column(
                "annotation_version",
                sa.BigInteger(),
                nullable=False,
                server_default="0",
            ),
        )
    if "has_annotation" not in columns:
        op.add_column(
            "image_files",
            sa.Column(
                "has_annotation",
                sa.Boolean(),
                nullable=False,
                server_default=sa.false(),
            ),
        )
    for name in ("annotation_created_at", "annotation_updated_at"):
        if name not in columns:
            op.add_column("image_files", sa.Column(name, sa.DateTime(), nullable=True))
    for name in ("annotation_created_by", "annotation_updated_by"):
        if name not in columns:
            op.add_column("image_files", sa.Column(name, sa.Integer(), nullable=True))
            op.create_foreign_key(
                f"fk_image_files_{name}",
                "image_files",
                "users",
                [name],
                ["id"],
            )

    inspector = sa.inspect(bind)
    image_indexes = {index["name"] for index in inspector.get_indexes("image_files")}
    if "idx_image_files_active_status_created" not in image_indexes:
        op.create_index(
            "idx_image_files_active_status_created",
            "image_files",
            ["is_deleted", "status", "created_at"],
        )

    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "image_annotation_revisions" not in tables:
        op.create_table(
            "image_annotation_revisions",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("image_file_id", sa.Integer(), nullable=False),
            sa.Column("version", sa.BigInteger(), nullable=False),
            sa.Column("snapshot", sa.JSON(), nullable=False),
            sa.Column("source", sa.String(length=32), nullable=False),
            sa.Column("reason", sa.String(length=32), nullable=False),
            sa.Column("actor_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
            sa.ForeignKeyConstraint(["image_file_id"], ["image_files.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint(
                "image_file_id",
                "version",
                name="uq_image_annotation_revision_version",
            ),
        )
        op.create_index(
            "idx_image_annotation_revisions_file_created",
            "image_annotation_revisions",
            ["image_file_id", "created_at"],
        )
    if "image_annotation_item_events" not in tables:
        op.create_table(
            "image_annotation_item_events",
            sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
            sa.Column("revision_id", sa.BigInteger(), nullable=False),
            sa.Column("image_file_id", sa.Integer(), nullable=False),
            sa.Column("item_kind", sa.String(length=32), nullable=False),
            sa.Column("item_id", sa.String(length=128), nullable=False),
            sa.Column("action", sa.String(length=16), nullable=False),
            sa.Column("before_payload", sa.JSON(), nullable=True),
            sa.Column("after_payload", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["image_file_id"], ["image_files.id"]),
            sa.ForeignKeyConstraint(
                ["revision_id"],
                ["image_annotation_revisions.id"],
                ondelete="CASCADE",
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "idx_annotation_item_events_identity",
            "image_annotation_item_events",
            ["image_file_id", "item_kind", "item_id", "revision_id"],
        )

    _backfill(bind)


def downgrade() -> None:
    op.drop_index(
        "idx_image_files_active_status_created",
        table_name="image_files",
    )
    op.drop_table("image_annotation_item_events")
    op.drop_table("image_annotation_revisions")
    for name in ("annotation_updated_by", "annotation_created_by"):
        op.drop_constraint(f"fk_image_files_{name}", "image_files", type_="foreignkey")
        op.drop_column("image_files", name)
    for name in ("annotation_updated_at", "annotation_created_at"):
        op.drop_column("image_files", name)
    op.drop_column("image_files", "has_annotation")
    op.drop_column("image_files", "annotation_version")
