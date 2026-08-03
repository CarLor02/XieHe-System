"""系统管理用例的 FastAPI 依赖装配。"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.contexts.system_management.application import (
    SystemManagementApplicationService,
)
from app.contexts.system_management.infrastructure import (
    PsutilResourceProbe,
    SqlAlchemySystemRepository,
)
from app.shared.database import get_db


def get_system_management_service(
    db: Session = Depends(get_db),
) -> SystemManagementApplicationService:
    repository = SqlAlchemySystemRepository(db)
    return SystemManagementApplicationService(
        repository,
        repository,
        PsutilResourceProbe(),
    )
