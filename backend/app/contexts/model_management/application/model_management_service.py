"""AI 模型目录应用用例。"""

from __future__ import annotations

import uuid
from collections.abc import Callable, Mapping
from dataclasses import replace
from datetime import datetime
from typing import Any

from app.contexts.model_management.domain import (
    AIModel,
    ModelCatalog,
    ModelConfiguration,
    ModelNotFound,
    ModelOperationRejected,
    ModelStatus,
    ModelViewType,
)

from .dto import (
    CreateModelCommand,
    DeleteModelResult,
    ModelListPage,
    ModelStats,
    UpdateModelCommand,
)
from .ports import ModelCatalogRepository, ModelRuntimeGateway, ModelTestFile


def _new_model_token() -> str:
    return uuid.uuid4().hex


def _find_model(catalog: ModelCatalog, model_id: str) -> AIModel | None:
    return next((model for model in catalog.models if model.id == model_id), None)


class ModelManagementApplicationService:
    def __init__(
        self,
        repository: ModelCatalogRepository,
        runtime: ModelRuntimeGateway,
        *,
        now: Callable[[], datetime] = datetime.now,
        token_factory: Callable[[], str] = _new_model_token,
    ) -> None:
        self._repository = repository
        self._runtime = runtime
        self._now = now
        self._token_factory = token_factory

    def list(
        self,
        *,
        page: int,
        page_size: int,
        view_type: ModelViewType | None,
        search: str | None,
    ) -> ModelListPage:
        catalog = self._repository.load()
        models = list(catalog.models)
        if view_type is not None:
            models = [model for model in models if model.view_type is view_type]
        if search:
            term = search.lower()
            models = [
                model
                for model in models
                if term in model.name.lower()
                or bool(model.description and term in model.description.lower())
            ]
        enhanced = []
        defaults = {
            catalog.configuration.front_model_id,
            catalog.configuration.side_model_id,
        }
        for model in models:
            item = model.to_dict()
            item["is_system_default"] = model.id in defaults
            item["can_delete"] = model.id not in defaults
            enhanced.append(item)
        start = (page - 1) * page_size
        return ModelListPage(
            items=tuple(enhanced[start : start + page_size]),
            total=len(enhanced),
            page=page,
            page_size=page_size,
        )

    async def create(self, command: CreateModelCommand) -> AIModel:
        catalog = self._repository.load()
        status = (
            await self._runtime.check_health(command.endpoint_url)
            if command.endpoint_url
            else ModelStatus.STOPPED
        )
        timestamp = self._now().isoformat()
        model = AIModel(
            id=f"MODEL_{self._token_factory()[:8].upper()}",
            name=command.name,
            description=command.description,
            view_type=command.view_type,
            version=command.version,
            status=status,
            endpoint_url=command.endpoint_url,
            is_active=False,
            created_at=timestamp,
            updated_at=timestamp,
            tags=command.tags,
        )
        self._repository.save(replace(catalog, models=(*catalog.models, model)))
        return model

    def get(self, model_id: str) -> AIModel:
        model = _find_model(self._repository.load(), model_id)
        if model is None:
            raise ModelNotFound(model_id)
        return model

    def update(self, model_id: str, command: UpdateModelCommand) -> AIModel:
        catalog = self._repository.load()
        current = _find_model(catalog, model_id)
        if current is None:
            raise ModelNotFound(model_id)
        changes = self._normalize_changes(command.changes)
        changes["updated_at"] = self._now().isoformat()
        updated = current.with_updates(**changes)
        self._repository.save(
            replace(
                catalog,
                models=tuple(
                    updated if model.id == model_id else model
                    for model in catalog.models
                ),
            )
        )
        return updated

    async def refresh_status(self, model_id: str) -> AIModel:
        catalog = self._repository.load()
        current = _find_model(catalog, model_id)
        if current is None:
            raise ModelNotFound(model_id)
        updated = current.with_updates(
            status=await self._runtime.check_health(current.endpoint_url),
            updated_at=self._now().isoformat(),
        )
        self._repository.save(
            replace(
                catalog,
                models=tuple(
                    updated if model.id == model_id else model
                    for model in catalog.models
                ),
            )
        )
        return updated

    def get_configuration(self) -> ModelConfiguration:
        return self._repository.load().configuration

    def update_configuration(self, updates: Mapping[str, str]) -> ModelConfiguration:
        catalog = self._repository.load()
        config = replace(
            catalog.configuration,
            front_model_id=updates.get(
                "front_model_id", catalog.configuration.front_model_id
            ),
            side_model_id=updates.get(
                "side_model_id", catalog.configuration.side_model_id
            ),
        )
        models = tuple(
            model.with_updates(
                is_active=(
                    model.id == config.front_model_id
                    if model.view_type is ModelViewType.FRONT
                    else model.id == config.side_model_id
                    if model.view_type is ModelViewType.SIDE
                    else model.is_active
                )
            )
            for model in catalog.models
        )
        self._repository.save(ModelCatalog(models=models, configuration=config))
        return config

    def stats(self) -> ModelStats:
        models = self._repository.load().models
        return ModelStats(
            total_models=len(models),
            active_models=sum(model.is_active for model in models),
            view_distribution={
                view.value: sum(model.view_type is view for model in models)
                for view in ModelViewType
            },
        )

    def activate(self, model_id: str) -> dict[str, Any]:
        catalog = self._repository.load()
        current = _find_model(catalog, model_id)
        if current is None:
            raise ModelNotFound(model_id)
        models = tuple(
            model.with_updates(is_active=model.id == model_id)
            if model.view_type is current.view_type
            else model
            for model in catalog.models
        )
        config = catalog.configuration
        if current.view_type is ModelViewType.FRONT:
            config = replace(config, front_model_id=model_id)
        elif current.view_type is ModelViewType.SIDE:
            config = replace(config, side_model_id=model_id)
        self._repository.save(ModelCatalog(models=models, configuration=config))
        return {"success": True, "model_id": model_id}

    def delete(self, model_id: str) -> DeleteModelResult:
        catalog = self._repository.load()
        if model_id in {
            catalog.configuration.front_model_id,
            catalog.configuration.side_model_id,
        }:
            raise ModelOperationRejected("系统默认模型不能删除")
        current = _find_model(catalog, model_id)
        if current is None:
            raise ModelNotFound(model_id)
        default_model_id = (
            catalog.configuration.front_model_id
            if current.view_type is ModelViewType.FRONT
            else catalog.configuration.side_model_id
            if current.view_type is ModelViewType.SIDE
            else None
        )
        fallback_to_default = bool(
            current.is_active
            and default_model_id
            and _find_model(catalog, default_model_id) is not None
        )
        models = tuple(
            model.with_updates(
                is_active=(
                    model.id == default_model_id
                    if fallback_to_default and model.view_type is current.view_type
                    else model.is_active
                )
            )
            for model in catalog.models
            if model.id != model_id
        )
        self._repository.save(
            replace(
                catalog,
                models=models,
            )
        )
        return DeleteModelResult(
            fallback_to_default=fallback_to_default,
            default_model_id=default_model_id if fallback_to_default else None,
        )

    async def test(
        self, model_id: str, files: tuple[ModelTestFile, ...]
    ) -> dict[str, Any]:
        model = self.get(model_id)
        if not model.endpoint_url:
            raise ModelOperationRejected("Model endpoint not configured")
        return await self._runtime.test(model.endpoint_url, files)

    @staticmethod
    def _normalize_changes(changes: Mapping[str, Any]) -> dict[str, Any]:
        allowed = {
            "name",
            "description",
            "view_type",
            "endpoint_url",
            "version",
            "tags",
        }
        normalized = {key: value for key, value in changes.items() if key in allowed}
        if "view_type" in normalized:
            normalized["view_type"] = ModelViewType(normalized["view_type"])
        if "tags" in normalized:
            normalized["tags"] = tuple(normalized["tags"] or ())
        return normalized
