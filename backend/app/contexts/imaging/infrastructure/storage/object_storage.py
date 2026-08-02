"""内部 storage-service 到影像对象存储端口的适配。"""

from __future__ import annotations

from app.contexts.imaging.application.dto import (
    MultipartPart,
    MultipartUpload,
    ObjectWriteResult,
    PresignedPart,
    StoredObject,
)
from app.contexts.imaging.application.errors import ObjectStorageUnavailableError
from app.shared.storage import (
    StorageServiceClient,
    StorageServiceError,
    storage_service_client,
)


class StorageServiceObjectStorage:
    def __init__(self, client: StorageServiceClient = storage_service_client) -> None:
        self._client = client

    async def ensure_bucket(self, bucket: str) -> None:
        try:
            await self._client.ensure_bucket(bucket)
        except StorageServiceError as exc:
            raise ObjectStorageUnavailableError(str(exc)) from exc

    async def create_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        content_type: str,
        metadata: dict[str, str],
        part_count: int,
        expires_in: int,
    ) -> MultipartUpload:
        try:
            payload = await self._client.create_multipart_upload(
                bucket=bucket,
                object_key=object_key,
                content_type=content_type,
                metadata=metadata,
                part_count=part_count,
                expires_in=expires_in,
            )
        except StorageServiceError as exc:
            raise ObjectStorageUnavailableError(str(exc)) from exc
        return MultipartUpload(
            upload_id=str(payload["upload_id"]),
            parts=[
                PresignedPart(
                    part_number=int(part["part_number"]),
                    url=str(part["url"]),
                )
                for part in payload.get("parts", [])
            ],
        )

    async def complete_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        upload_id: str,
        parts: list[MultipartPart],
    ) -> ObjectWriteResult:
        try:
            payload = await self._client.complete_multipart_upload(
                bucket=bucket,
                object_key=object_key,
                upload_id=upload_id,
                parts=[
                    {"part_number": part.part_number, "etag": part.etag}
                    for part in parts
                ],
            )
        except StorageServiceError as exc:
            raise ObjectStorageUnavailableError(str(exc)) from exc
        value = payload.get("etag")
        return ObjectWriteResult(etag=str(value) if value is not None else None)

    async def presign_get(
        self,
        *,
        bucket: str,
        object_key: str,
        expires_in: int,
    ) -> str:
        try:
            return await self._client.presign_get(
                bucket=bucket,
                object_key=object_key,
                expires_in=expires_in,
            )
        except StorageServiceError as exc:
            raise ObjectStorageUnavailableError(str(exc)) from exc

    async def stat_object(self, *, bucket: str, object_key: str) -> StoredObject:
        try:
            result = await self._client.stat_object(
                bucket=bucket,
                object_key=object_key,
            )
        except StorageServiceError as exc:
            raise ObjectStorageUnavailableError(str(exc)) from exc
        return StoredObject(
            size=result.size,
            etag=result.etag,
            metadata=result.metadata,
        )

    async def put_object(
        self,
        *,
        bucket: str,
        object_key: str,
        data: bytes,
        content_type: str,
    ) -> ObjectWriteResult:
        try:
            payload = await self._client.put_object(
                bucket=bucket,
                object_key=object_key,
                data=data,
                content_type=content_type,
            )
        except StorageServiceError as exc:
            raise ObjectStorageUnavailableError(str(exc)) from exc
        value = payload.get("etag")
        return ObjectWriteResult(etag=str(value) if value is not None else None)
