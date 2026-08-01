"""Shared infrastructure for the internal object-storage service."""

from .client import StorageServiceClient, storage_service_client
from .exceptions import StorageServiceError
from .models import StorageObjectStat

__all__ = [
    "StorageObjectStat",
    "StorageServiceClient",
    "StorageServiceError",
    "storage_service_client",
]
