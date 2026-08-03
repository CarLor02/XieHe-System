from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.contexts.model_management.application import (
    ModelManagementApplicationService,
    UpdateModelCommand,
)
from app.contexts.model_management.domain import ModelStatus
from app.contexts.model_management.infrastructure.persistence import (
    JsonModelCatalogRepository,
)


class _Runtime:
    async def check_health(self, endpoint_url: str) -> ModelStatus:
        return ModelStatus.READY

    async def test(
        self, endpoint_url: str, files: tuple[tuple[str, bytes, str | None], ...]
    ) -> dict[str, Any]:
        return {"success": True}


def test_model_manager_reads_legacy_metadata_but_drops_it_on_write(
    tmp_path: Path,
) -> None:
    data_file = tmp_path / "models.json"
    data_file.write_text(
        json.dumps(
            {
                "models": [
                    {
                        "id": "MODEL_LEGACY",
                        "name": "历史模型",
                        "description": None,
                        "view_type": "front",
                        "version": "1.0.0",
                        "status": "ready",
                        "endpoint_url": "http://model/api/measurement",
                        "is_active": True,
                        "accuracy": 0.95,
                        "created_at": "2026-01-01T00:00:00",
                        "updated_at": "2026-01-01T00:00:00",
                        "creator": "legacy-user",
                        "tags": [],
                    }
                ],
                "configuration": {
                    "front_model_id": "MODEL_LEGACY",
                    "side_model_id": None,
                },
            }
        ),
        encoding="utf-8",
    )

    repository = JsonModelCatalogRepository(data_file)
    service = ModelManagementApplicationService(repository, _Runtime())
    models = repository.load().models

    assert [model.id for model in models] == ["MODEL_LEGACY"]
    service.update(
        "MODEL_LEGACY",
        UpdateModelCommand(changes={"name": "迁移后的模型"}),
    )

    persisted_model = json.loads(data_file.read_text(encoding="utf-8"))["models"][0]
    assert persisted_model["name"] == "迁移后的模型"
    assert "accuracy" not in persisted_model
    assert "creator" not in persisted_model


def test_delete_active_non_default_model_falls_back_to_configured_default(
    tmp_path: Path,
) -> None:
    data_file = tmp_path / "models.json"
    base_model: dict[str, Any] = {
        "description": None,
        "view_type": "front",
        "version": "1.0.0",
        "status": "ready",
        "endpoint_url": "http://model/api/measurement",
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
        "tags": [],
    }
    data_file.write_text(
        json.dumps(
            {
                "models": [
                    {
                        **base_model,
                        "id": "MODEL_DEFAULT",
                        "name": "默认模型",
                        "is_active": False,
                    },
                    {
                        **base_model,
                        "id": "MODEL_CUSTOM",
                        "name": "待删除模型",
                        "is_active": True,
                    },
                ],
                "configuration": {
                    "front_model_id": "MODEL_DEFAULT",
                    "side_model_id": None,
                },
            }
        ),
        encoding="utf-8",
    )
    repository = JsonModelCatalogRepository(data_file)
    service = ModelManagementApplicationService(repository, _Runtime())

    result = service.delete("MODEL_CUSTOM")

    assert result.fallback_to_default is True
    assert result.default_model_id == "MODEL_DEFAULT"
    remaining = repository.load().models
    assert [(model.id, model.is_active) for model in remaining] == [
        ("MODEL_DEFAULT", True)
    ]
