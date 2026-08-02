from __future__ import annotations

import inspect

from fastapi.params import Depends

from app.contexts.imaging.interface.http.v1.routes.delivery import (
    get_image_file_download_urls,
)
from app.contexts.imaging.interface.http.v1.routes.predictions import (
    run_image_file_ai_predict,
)
from app.core.system.concurrency import (
    require_ai_object_slot,
    require_batch_presign_slot,
)


def _dependency_functions(endpoint) -> set[object]:
    dependencies: set[object] = set()
    for parameter in inspect.signature(endpoint).parameters.values():
        if isinstance(parameter.default, Depends):
            dependencies.add(parameter.default.dependency)
    return dependencies


def test_heavy_endpoints_declare_concurrency_dependencies() -> None:
    assert require_batch_presign_slot in _dependency_functions(
        get_image_file_download_urls
    )
    assert require_ai_object_slot in _dependency_functions(run_image_file_ai_predict)
