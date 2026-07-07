from __future__ import annotations

import os
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class StorageServiceHTTPError(Exception):
    status_code: int
    reason: str


@dataclass(frozen=True)
class StorageServiceUnavailableError(Exception):
    reason: str


class StorageServiceNotConfiguredError(Exception):
    pass


def fetch_object_image_bytes(bucket: str, object_key: str) -> bytes:
    storage_service_url = os.getenv("STORAGE_SERVICE_URL", "").rstrip("/")
    storage_service_token = os.getenv("STORAGE_SERVICE_TOKEN", "")
    timeout = float(os.getenv("STORAGE_SERVICE_TIMEOUT", "30"))

    if not storage_service_url or not storage_service_token:
        raise StorageServiceNotConfiguredError("Storage service is not configured")

    object_url = (
        f"{storage_service_url}/objects/"
        f"{quote(bucket, safe='')}/"
        f"{quote(object_key, safe='/')}"
    )
    request = Request(
        object_url,
        headers={"X-Storage-Service-Token": storage_service_token},
        method="GET",
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            return response.read()
    except HTTPError as exc:
        raise StorageServiceHTTPError(exc.code, exc.reason) from exc
    except URLError as exc:
        raise StorageServiceUnavailableError(str(exc.reason)) from exc
