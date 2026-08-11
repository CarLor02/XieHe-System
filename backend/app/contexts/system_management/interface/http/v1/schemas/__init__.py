"""系统管理 HTTP schema。"""

from .health import (
    ComponentHealthResponse,
    DetailedHealthResponse,
    HealthStatusResponse,
)
from .management import (
    SystemConfigResponse,
    SystemHealthResponse,
    SystemStatsResponse,
)

__all__ = [
    "ComponentHealthResponse",
    "DetailedHealthResponse",
    "HealthStatusResponse",
    "SystemConfigResponse",
    "SystemHealthResponse",
    "SystemStatsResponse",
]
