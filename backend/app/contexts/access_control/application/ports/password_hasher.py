"""密码哈希端口。"""

from typing import Protocol


class PasswordHasher(Protocol):
    async def hash(self, password: str) -> str: ...

    async def verify(self, plain_password: str, hashed_password: str) -> bool: ...
