from app.api.v1.api import api_router
from app.contexts.imaging.interface import router


def test_legacy_diagnosis_routes_are_not_registered() -> None:
    paths = {route.path for route in router.routes}

    assert not any(path.startswith("/ai-diagnosis/") for path in paths)
    assert "/image-files/{file_id}/ai/predict" in paths


def test_legacy_measurement_routes_are_not_registered() -> None:
    paths = {route.path for route in api_router.routes}

    assert not any(path.startswith("/measurements") for path in paths)
    assert "/image-files/{file_id}/annotation" in paths
    assert "/image-files/{file_id}/annotation-history" in paths
