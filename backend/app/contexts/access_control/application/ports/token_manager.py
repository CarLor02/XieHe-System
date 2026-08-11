"""令牌签发与状态端口。"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Protocol


class TokenManager(Protocol):
    def create_access_token(
        self, data: dict[str, Any], expires_delta: timedelta | None = None
    ) -> str: ...

    async def create_refresh_token(
        self, data: dict[str, Any], expires_delta: timedelta | None = None
    ) -> str: ...

    async def verify_token(
        self, token: str, token_type: str = "access"
    ) -> dict[str, Any] | None: ...

    async def blacklist_token(self, token: str, ttl: int | None = None) -> bool: ...

    async def generate_api_key(self, user_id: str, name: str = "default") -> str: ...

    async def verify_api_key(self, api_key: str) -> dict[str, Any] | None: ...

    async def revoke_api_key(self, api_key: str) -> bool: ...
