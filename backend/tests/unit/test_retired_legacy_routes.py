"""已下线兼容路由不得重新进入主 API。"""

from app.api.v1.api import api_router


def test_retired_legacy_routes_are_not_registered() -> None:
    paths = {route.path for route in api_router.routes}

    assert "/auth/password/change" in paths
    assert "/permissions/users" in paths
    assert "/auth/password/reset" not in paths
    assert "/auth/password/reset/confirm" not in paths
    assert not any(path.startswith("/notifications") for path in paths)
    assert not any(path.startswith("/monitoring") for path in paths)
    assert "/permissions/roles" not in paths
    assert "/permissions/permissions" not in paths
