"""Versioned, validated migration evidence and reversible database plans."""

from __future__ import annotations

import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MigrationError(Exception):
    """An inconsistent snapshot or an unsafe migration operation."""


class Document(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ObjectState(Document):
    bucket: str
    key: str
    size: int = Field(ge=0)
    etag: str
    last_modified: str
    headers: dict[str, str] = Field(default_factory=dict)
    metadata: dict[str, str] = Field(default_factory=dict)
    tags: dict[str, str] = Field(default_factory=dict)


class ObjectEvidence(Document):
    source: ObjectState
    destination: ObjectState
    sha256: str = Field(pattern=r"^[0-9a-f]{64}$")


class Manifest(Document):
    format: Literal[1] = 1
    kind: Literal["s3-object-migration"] = "s3-object-migration"
    source_endpoint: str
    destination_endpoint: str
    completed_at: str
    buckets: list[str]
    objects: list[ObjectEvidence]

    @model_validator(mode="after")
    def check_objects(self) -> Manifest:
        keys = [(o.source.bucket, o.source.key) for o in self.objects]
        if len(keys) != len(set(keys)) or len(self.buckets) != len(set(self.buckets)):
            raise ValueError("duplicate bucket/object in manifest")
        for obj in self.objects:
            if obj.source.bucket not in self.buckets:
                raise ValueError("object outside manifest buckets")
            if (obj.source.bucket, obj.source.key, obj.source.size) != (
                obj.destination.bucket,
                obj.destination.key,
                obj.destination.size,
            ):
                raise ValueError("object key/size differs between stores")
        return self


TableName = Literal[
    "image_files", "image_file_derivatives", "users", "image_upload_sessions"
]


class Record(Document):
    table: TableName
    id: int
    values: dict[str, Any]


class Change(Document):
    table: TableName
    id: int
    before: dict[str, Any]
    after: dict[str, Any]


class Plan(Document):
    format: Literal[1] = 1
    kind: Literal["s3-database-metadata"] = "s3-database-metadata"
    created_at: str
    database: str
    source_endpoint: str
    destination_endpoint: str
    manifest_sha256: str
    snapshot: list[Record]
    changes: list[Change]
    evidence: list[ObjectEvidence]
    prepared_objects: list[ObjectState]
    buckets: list[str]
    legacy_thumbnail_ids: list[int]


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def fingerprint(value: Any) -> str:
    raw = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(raw.encode()).hexdigest()


def save(path: Path, document: Document) -> None:
    """Publish evidence atomically; interrupted runs never leave a valid-looking file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            stream.write(document.model_dump_json(indent=2))
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        # Atomic no-clobber publication also protects plans from concurrent runs.
        os.link(name, path)
    finally:
        Path(name).unlink(missing_ok=True)


def load_manifest(path: Path) -> Manifest:
    return Manifest.model_validate_json(path.read_text())


def load_plan(path: Path) -> Plan:
    return Plan.model_validate_json(path.read_text())
