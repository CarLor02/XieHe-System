"""Exceptions raised by the internal object-storage service client."""


class StorageServiceError(RuntimeError):
    """Raised when the storage service rejects a request."""

    def __init__(self, message: str, *, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code
