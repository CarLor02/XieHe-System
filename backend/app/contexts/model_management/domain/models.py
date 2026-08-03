"""AI 模型目录领域对象。"""

from __future__ import annotations

from dataclasses import dataclass, replace
from enum import StrEnum
from typing import Any


class ModelViewType(StrEnum):
    FRONT = "front"
    SIDE = "side"
    OTHER = "other"


class ModelStatus(StrEnum):
    READY = "ready"
    STOPPED = "stopped"
    ERROR = "error"


@dataclass(frozen=True, slots=True)
class AIModel:
    id: str
    name: str
    description: str | None
    view_type: ModelViewType
    version: str
    status: ModelStatus
    endpoint_url: str
    is_active: bool
    created_at: str
    updated_at: str
    tags: tuple[str, ...]

    def with_updates(self, **changes: Any) -> AIModel:
        return replace(self, **changes)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "view_type": self.view_type.value,
            "version": self.version,
            "status": self.status.value,
            "endpoint_url": self.endpoint_url,
            "is_active": self.is_active,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "tags": list(self.tags),
        }


@dataclass(frozen=True, slots=True)
class ModelConfiguration:
    front_model_id: str | None = None
    side_model_id: str | None = None

    def to_dict(self) -> dict[str, str | None]:
        return {
            "front_model_id": self.front_model_id,
            "side_model_id": self.side_model_id,
        }


@dataclass(frozen=True, slots=True)
class ModelCatalog:
    models: tuple[AIModel, ...] = ()
    configuration: ModelConfiguration = ModelConfiguration()


class ModelManagementError(ValueError):
    """模型管理领域错误基类。"""


class ModelNotFound(ModelManagementError):
    def __init__(self, model_id: str) -> None:
        super().__init__("模型未找到")
        self.model_id = model_id


class ModelOperationRejected(ModelManagementError):
    """模型存在但当前操作不允许。"""
