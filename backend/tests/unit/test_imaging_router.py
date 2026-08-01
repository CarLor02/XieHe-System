from app.api.v1.endpoints.imaging.router import router


def test_legacy_diagnosis_routes_are_not_registered() -> None:
    paths = {route.path for route in router.routes}

    assert not any(path.startswith("/ai-diagnosis/") for path in paths)
    assert "/image-files/{file_id}/ai/predict" in paths
