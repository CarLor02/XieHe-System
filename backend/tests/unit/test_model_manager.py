from __future__ import annotations

import json
from pathlib import Path

from app.services.model_manager import ModelManager


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

    manager = ModelManager(data_file=str(data_file))
    models = manager.get_models()

    assert [model.id for model in models] == ["MODEL_LEGACY"]
    manager.update_model("MODEL_LEGACY", {"name": "迁移后的模型"})

    persisted_model = json.loads(data_file.read_text(encoding="utf-8"))["models"][0]
    assert persisted_model["name"] == "迁移后的模型"
    assert "accuracy" not in persisted_model
    assert "creator" not in persisted_model
