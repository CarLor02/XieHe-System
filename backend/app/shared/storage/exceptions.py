"""Exceptions raised by the internal object-storage service client."""


class StorageServiceError(RuntimeError):
    """Raised when the storage service rejects a request."""
