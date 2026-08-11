"""头像对象存储适配器。"""

from __future__ import annotations

from typing import Any

from app.shared.storage import storage_service_client


class StorageServiceAvatarStorage:
    async def presign_get(
        self, *, bucket: str, object_key: str, expires_in: int
    ) -> str:
        return await storage_service_client.presign_get(
            bucket=bucket, object_key=object_key, expires_in=expires_in
        )

    async def create_upload_session(
        self,
        *,
        bucket: str,
        object_key: str,
        content_type: str,
        metadata: dict[str, str],
        part_count: int,
        expires_in: int,
    ) -> dict[str, Any]:
        await storage_service_client.ensure_bucket(bucket)
        return await storage_service_client.create_multipart_upload(
            bucket=bucket,
            object_key=object_key,
            content_type=content_type,
            metadata=metadata,
            part_count=part_count,
            expires_in=expires_in,
        )

    async def complete_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        upload_id: str,
        parts: list[dict[str, Any]],
    ) -> str | None:
        result = await storage_service_client.complete_multipart_upload(
            bucket=bucket,
            object_key=object_key,
            upload_id=upload_id,
            parts=parts,
        )
        stat_result = await storage_service_client.stat_object(
            bucket=bucket, object_key=object_key
        )
        value = result.get("etag") or stat_result.etag
        return str(value) if value is not None else None
