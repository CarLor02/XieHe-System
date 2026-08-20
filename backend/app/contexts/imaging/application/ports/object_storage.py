"""对象存储能力端口。"""

from __future__ import annotations

from typing import BinaryIO, Protocol

from app.contexts.imaging.application.dto import (
    MultipartPart,
    MultipartUpload,
    ObjectWriteResult,
    StoredObject,
)


class ObjectStorage(Protocol):
    async def ensure_bucket(self, bucket: str) -> None: ...

    async def create_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        content_type: str,
        metadata: dict[str, str],
        part_count: int,
        expires_in: int,
    ) -> MultipartUpload: ...

    async def complete_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        upload_id: str,
        parts: list[MultipartPart],
    ) -> ObjectWriteResult: ...

    async def abort_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        upload_id: str,
    ) -> None: ...

    async def presign_get(
        self,
        *,
        bucket: str,
        object_key: str,
        expires_in: int,
    ) -> str: ...

    async def stat_object(self, *, bucket: str, object_key: str) -> StoredObject: ...

    async def download_object_to(
        self,
        *,
        bucket: str,
        object_key: str,
        destination: BinaryIO,
    ) -> None: ...

    async def put_object(
        self,
        *,
        bucket: str,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> ObjectWriteResult: ...
