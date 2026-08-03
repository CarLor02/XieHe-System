"""Model-management commands and query results."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping

from app.contexts.model_management.domain import AIModel, ModelViewType


@dataclass(frozen=True, slots=True)
class CreateModelCommand:
    name: str
    description: str | None
    view_type: ModelViewType
    endpoint_url: str
    version: str
    tags: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class UpdateModelCommand:
    changes: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class ModelListPage:
    items: tuple[dict[str, Any], ...]
    total: int
    page: int
    page_size: int


@dataclass(frozen=True, slots=True)
class ModelStats:
    total_models: int
    active_models: int
    view_distribution: dict[str, int]

    def to_dict(self) -> dict[str, Any]:
        return {
            "total_models": self.total_models,
            "active_models": self.active_models,
            "view_distribution": self.view_distribution,
        }


@dataclass(frozen=True, slots=True)
class DeleteModelResult:
    fallback_to_default: bool
    default_model_id: str | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": True,
            "fallback_to_default": self.fallback_to_default,
            "default_model_id": self.default_model_id,
        }


def model_response(model: AIModel) -> dict[str, Any]:
    return model.to_dict()
