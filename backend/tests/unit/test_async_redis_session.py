from __future__ import annotations

import pytest

from app.shared.redis.client import RedisStateClientManager
from app.shared.redis.exceptions import RedisStateUnavailable


def test_state_redis_requires_lifecycle_or_lazy_start() -> None:
    manager = RedisStateClientManager(
        url="redis://127.0.0.1:6379/0",
        timeout=0.1,
        pool_size=1,
    )

    with pytest.raises(RedisStateUnavailable):
        manager.get()
