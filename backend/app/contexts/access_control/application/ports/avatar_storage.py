"""用户头像对象存储端口。"""

from __future__ import annotations

from typing import Any, Protocol


class AvatarStorage(Protocol):
    async def presign_get(
        self, *, bucket: str, object_key: str, expires_in: int
    ) -> str: ...

    async def create_upload_session(
        self,
        *,
        bucket: str,
        object_key: str,
        content_type: str,
        metadata: dict[str, str],
        part_count: int,
        expires_in: int,
    ) -> dict[str, Any]: ...

    async def complete_upload(
        self,
        *,
        bucket: str,
        object_key: str,
        upload_id: str,
        parts: list[dict[str, Any]],
    ) -> str | None: ...
