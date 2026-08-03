"""Model-catalog persistence port."""

from typing import Protocol

from app.contexts.model_management.domain import ModelCatalog


class ModelCatalogRepository(Protocol):
    def load(self) -> ModelCatalog: ...

    def save(self, catalog: ModelCatalog) -> None: ...
