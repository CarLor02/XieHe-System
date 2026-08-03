"""Model-management HTTP dependencies."""

from app.contexts.model_management.application import (
    ModelManagementApplicationService,
)
from app.contexts.model_management.infrastructure.persistence import (
    JsonModelCatalogRepository,
)
from app.contexts.model_management.infrastructure.runtime import (
    HttpModelRuntimeGateway,
)


def get_model_management_service() -> ModelManagementApplicationService:
    return ModelManagementApplicationService(
        JsonModelCatalogRepository(),
        HttpModelRuntimeGateway(),
    )
