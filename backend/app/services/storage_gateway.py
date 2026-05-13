"""HTTP client for the internal Go object-storage service."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional

import httpx

from app.core.config import settings


@dataclass(frozen=True)
class StorageObjectStat:
    bucket: str
    object_key: str
    size: int
    etag: Optional[str]
    content_type: Optional[str]
    metadata: Dict[str, str]


class StorageServiceError(RuntimeError):
    """Raised when the storage service rejects a request."""


class StorageGateway:
    """Small async wrapper around the internal object-storage service."""

    def __init__(self) -> None:
        self.base_url = settings.STORAGE_SERVICE_URL.rstrip("/")
        self.timeout = settings.STORAGE_SERVICE_TIMEOUT
        self.headers = {"X-Storage-Service-Token": settings.STORAGE_SERVICE_TOKEN}

    async def _request(self, method: str, path: str, **kwargs: Any) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers={**self.headers, **kwargs.pop("headers", {})},
                **kwargs,
            )

        if response.status_code >= 400:
            raise StorageServiceError(
                f"storage service {method} {path} failed: "
                f"{response.status_code} {response.text}"
            )

        if not response.content:
            return {}
        payload = response.json()
        if isinstance(payload, dict) and "code" in payload and "data" in payload:
            return payload.get("data") or {}
        return payload

    async def ensure_bucket(self, bucket: str) -> None:
        await self._request("POST", "/buckets/ensure", json={"bucket": bucket})

    async def create_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        content_type: str,
        metadata: Dict[str, str],
        part_count: int,
        expires_in: int,
    ) -> Dict[str, Any]:
        return await self._request(
            "POST",
            "/multipart/create",
            json={
                "bucket": bucket,
                "object_key": object_key,
                "content_type": content_type,
                "metadata": metadata,
                "part_count": part_count,
                "expires_in": expires_in,
            },
        )

    async def complete_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        upload_id: str,
        parts: Iterable[Dict[str, Any]],
    ) -> Dict[str, Any]:
        return await self._request(
            "POST",
            "/multipart/complete",
            json={
                "bucket": bucket,
                "object_key": object_key,
                "upload_id": upload_id,
                "parts": list(parts),
            },
        )

    async def abort_multipart_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        upload_id: str,
    ) -> None:
        await self._request(
            "POST",
            "/multipart/abort",
            json={"bucket": bucket, "object_key": object_key, "upload_id": upload_id},
        )

    async def presign_get(
        self,
        *,
        bucket: str,
        object_key: str,
        expires_in: int,
    ) -> str:
        payload = await self._request(
            "POST",
            "/presign/get",
            json={"bucket": bucket, "object_key": object_key, "expires_in": expires_in},
        )
        return str(payload["url"])

    async def stat_object(self, *, bucket: str, object_key: str) -> StorageObjectStat:
        payload = await self._request(
            "POST",
            "/objects/stat",
            json={"bucket": bucket, "object_key": object_key},
        )
        return StorageObjectStat(
            bucket=str(payload["bucket"]),
            object_key=str(payload["object_key"]),
            size=int(payload["size"]),
            etag=payload.get("etag"),
            content_type=payload.get("content_type"),
            metadata=dict(payload.get("metadata") or {}),
        )

    async def delete_object(self, *, bucket: str, object_key: str) -> None:
        await self._request(
            "POST",
            "/objects/delete",
            json={"bucket": bucket, "object_key": object_key},
        )


storage_gateway = StorageGateway()
