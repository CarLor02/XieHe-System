"""Storage-service adapter for physical object deletion."""

from __future__ import annotations

from app.contexts.object_lifecycle.application.errors import ObjectDeletionError
from app.shared.storage import (
    StorageServiceClient,
    StorageServiceError,
    storage_service_client,
)


class StorageServiceObjectDeletionGateway:
    def __init__(self, client: StorageServiceClient = storage_service_client) -> None:
        self._client = client

    async def delete_object(self, *, bucket: str, object_key: str) -> None:
        try:
            await self._client.delete_object(bucket=bucket, object_key=object_key)
        except StorageServiceError as exc:
            raise ObjectDeletionError(str(exc)) from exc
