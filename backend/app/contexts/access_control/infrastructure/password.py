"""bcrypt 密码哈希适配器。"""

import asyncio

from .security import SecurityManager


class BcryptPasswordHasher:
    def __init__(self, security: SecurityManager) -> None:
        self._security = security

    async def hash(self, password: str) -> str:
        return await asyncio.to_thread(self._security.hash_password, password)

    async def verify(self, plain_password: str, hashed_password: str) -> bool:
        return await asyncio.to_thread(
            self._security.verify_password, plain_password, hashed_password
        )
