"""系统管理用例的 FastAPI 依赖装配。"""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.contexts.system_management.application import (
    HealthCheckApplicationService,
    SystemManagementApplicationService,
)
from app.contexts.system_management.infrastructure import (
    PsutilResourceProbe,
    SqlAlchemySystemRepository,
)
from app.contexts.system_management.infrastructure.probes import (
    CpuHealthProbe,
    FileSystemHealthProbe,
    HostMetricsProbe,
    MemoryHealthProbe,
    RedisHealthProbe,
    SqlAlchemyDatabaseHealthProbe,
)
from app.shared.cache.aiocache import query_cache
from app.shared.database import get_db
from app.shared.redis import state_redis


def get_system_management_service(
    db: Session = Depends(get_db),
) -> SystemManagementApplicationService:
    repository = SqlAlchemySystemRepository(db)
    return SystemManagementApplicationService(
        repository,
        repository,
        PsutilResourceProbe(),
    )


def get_health_check_service(
    db: Session = Depends(get_db),
) -> HealthCheckApplicationService:
    return HealthCheckApplicationService(
        [
            SqlAlchemyDatabaseHealthProbe(db),
            RedisHealthProbe(state_redis, query_cache),
            FileSystemHealthProbe(),
            MemoryHealthProbe(),
            CpuHealthProbe(),
        ],
        HostMetricsProbe(),
    )
