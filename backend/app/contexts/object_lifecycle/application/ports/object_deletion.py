"""Object-storage deletion port."""

from __future__ import annotations

from typing import Protocol


class ObjectDeletionGateway(Protocol):
    async def delete_object(self, *, bucket: str, object_key: str) -> None: ...
