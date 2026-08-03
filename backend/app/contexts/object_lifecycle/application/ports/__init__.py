"""Object lifecycle outbound ports."""

from .cleanup_repository import ObjectCleanupRepository
from .object_deletion import ObjectDeletionGateway

__all__ = ["ObjectCleanupRepository", "ObjectDeletionGateway"]
