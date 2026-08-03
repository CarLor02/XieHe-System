"""系统管理领域规则。"""

from .health import HealthStatus, merge_health_status, resource_health

__all__ = ["HealthStatus", "merge_health_status", "resource_health"]
