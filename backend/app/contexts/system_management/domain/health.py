"""系统资源健康状态的纯领域规则。"""

from typing import Literal

HealthStatus = Literal["healthy", "warning", "critical", "unhealthy"]


def resource_health(
    percent: float,
    warning_at: float,
    critical_at: float,
) -> HealthStatus:
    """按照资源使用率阈值返回组件健康状态。"""
    if percent > critical_at:
        return "critical"
    if percent > warning_at:
        return "warning"
    return "healthy"


def merge_health_status(
    current: HealthStatus,
    component: HealthStatus,
) -> HealthStatus:
    """将组件状态合并为面向 API 的系统总体状态。"""
    if component in {"critical", "unhealthy"}:
        return "unhealthy"
    if component == "warning" and current == "healthy":
        return "warning"
    return current
