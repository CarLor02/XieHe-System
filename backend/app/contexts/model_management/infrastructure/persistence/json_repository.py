"""JSON-file model catalog repository."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, cast

from app.contexts.model_management.domain import (
    AIModel,
    ModelCatalog,
    ModelConfiguration,
    ModelStatus,
    ModelViewType,
)


def _default_catalog_path() -> Path:
    return Path(__file__).resolve().parents[5] / "data" / "models.json"


def _model_from_dict(payload: dict[str, Any]) -> AIModel:
    description = payload.get("description")
    raw_tags = payload.get("tags", [])
    return AIModel(
        id=str(payload["id"]),
        name=str(payload["name"]),
        description=str(description) if description is not None else None,
        view_type=ModelViewType(str(payload.get("view_type", "other"))),
        version=str(payload.get("version", "1.0.0")),
        status=ModelStatus(str(payload.get("status", "ready"))),
        endpoint_url=str(payload.get("endpoint_url", "")),
        is_active=bool(payload.get("is_active", False)),
        created_at=str(payload["created_at"]),
        updated_at=str(payload["updated_at"]),
        tags=tuple(str(tag) for tag in cast(list[Any], raw_tags)),
    )


class JsonModelCatalogRepository:
    """Preserve the historical models.json wire format and tolerant reads."""

    def __init__(self, path: str | Path | None = None) -> None:
        self._path = Path(path) if path is not None else _default_catalog_path()
        if not self._path.exists():
            self.save(ModelCatalog())

    def load(self) -> ModelCatalog:
        try:
            payload = cast(
                dict[str, Any], json.loads(self._path.read_text(encoding="utf-8"))
            )
            raw_config = cast(dict[str, Any], payload.get("configuration", {}))
            configuration = ModelConfiguration(
                front_model_id=cast(str | None, raw_config.get("front_model_id")),
                side_model_id=cast(str | None, raw_config.get("side_model_id")),
            )
            raw_models = cast(list[dict[str, Any]], payload.get("models", []))
            return ModelCatalog(
                models=tuple(_model_from_dict(model) for model in raw_models),
                configuration=configuration,
            )
        except Exception:
            return ModelCatalog()

    def save(self, catalog: ModelCatalog) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "models": [model.to_dict() for model in catalog.models],
            "configuration": catalog.configuration.to_dict(),
        }
        self._path.write_text(
            json.dumps(payload, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
