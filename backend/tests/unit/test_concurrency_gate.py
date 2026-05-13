from __future__ import annotations

import pytest

from app.core.system.concurrency import ConcurrencyGate, ConcurrencyLimitExceeded


@pytest.mark.asyncio
async def test_concurrency_gate_rejects_when_limit_is_full() -> None:
    gate = ConcurrencyGate(name="unit-test", limit=1)

    async with gate.acquire():
        with pytest.raises(ConcurrencyLimitExceeded) as exc_info:
            async with gate.acquire():
                raise AssertionError("gate should reject before entering the block")

    assert exc_info.value.name == "unit-test"
    assert exc_info.value.limit == 1

    async with gate.acquire():
        assert gate.active == 1
