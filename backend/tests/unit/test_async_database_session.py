from __future__ import annotations

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database.session import AsyncSessionLocal, get_async_db


@pytest.mark.asyncio
async def test_get_async_db_yields_async_session() -> None:
    generator = get_async_db()
    session = await generator.__anext__()
    try:
        assert isinstance(session, AsyncSession)
        assert AsyncSessionLocal.kw["bind"] is session.bind
    finally:
        await generator.aclose()
