"""File upload and object storage configuration."""

from __future__ import annotations

from typing import List

from .base import BaseAppSettings


class StorageSettings(BaseAppSettings):
    """Settings for temporary files, storage-service, buckets, and upload limits."""

    TEMP_DIR: str = "./temp"
    STORAGE_SERVICE_URL: str = "http://storage-service:8090"
    STORAGE_SERVICE_TOKEN: str = "dev-storage-service-token"
    STORAGE_SERVICE_TIMEOUT: float = 30.0
    STORAGE_PRESIGN_EXPIRES_SECONDS: int = 900
    STORAGE_MULTIPART_PART_SIZE: int = 8 * 1024 * 1024
    IMAGE_FILE_BUCKET: str = "medical-image-files"
    USER_AVATAR_BUCKET: str = "medical-user-avatars"

    MAX_FILE_SIZE: int = 100 * 1024 * 1024
    MAX_IMAGE_SIZE: int = 50 * 1024 * 1024

    ALLOWED_IMAGE_TYPES: List[str] = [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".dcm", ".dicom"]
    ALLOWED_DOCUMENT_TYPES: List[str] = [".pdf", ".doc", ".docx", ".txt"]


storage_settings = StorageSettings()
