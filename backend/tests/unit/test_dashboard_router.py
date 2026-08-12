"""Dashboard 路由契约测试。"""

from app.api.v1.api import api_router
from app.main import app


def test_dashboard_v1_routes_are_registered_once() -> None:
    paths = [route.path for route in api_router.routes]
    assert paths.count("/dashboard/overview") == 1
    for path in (
        "/dashboard/stats",
        "/dashboard/recent-activities",
    ):
        assert path in paths

    assert "/dashboard/system-metrics" not in paths
    assert "/dashboard/tasks" not in paths


def test_temporary_dashboard_routes_are_removed() -> None:
    paths = [route.path for route in app.routes]
    assert "/dashboard/overview" not in paths
    assert paths.count("/api/v1/dashboard/overview") == 1
