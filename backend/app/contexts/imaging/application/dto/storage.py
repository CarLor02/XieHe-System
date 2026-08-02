"""对象存储端口使用的明确数据结构。"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MultipartPart:
    part_number: int
    etag: str


@dataclass(frozen=True, slots=True)
class PresignedPart:
    part_number: int
    url: str


@dataclass(frozen=True, slots=True)
class MultipartUpload:
    upload_id: str
    parts: list[PresignedPart]


@dataclass(frozen=True, slots=True)
class StoredObject:
    size: int
    etag: str | None
    metadata: dict[str, str]


@dataclass(frozen=True, slots=True)
class ObjectWriteResult:
    etag: str | None
