"""系统配置、统计和健康检查的应用编排。"""

from datetime import datetime

from app.contexts.system_management.domain import (
    HealthStatus,
    merge_health_status,
    resource_health,
)

from .dto import SystemConfigItem, SystemHealth, SystemStats
from .ports import ResourceProbe, SystemConfigRepository, SystemStatisticsRepository


class SystemManagementApplicationService:
    def __init__(
        self,
        config_repository: SystemConfigRepository,
        statistics_repository: SystemStatisticsRepository,
        resource_probe: ResourceProbe,
    ) -> None:
        self._configs = config_repository
        self._statistics = statistics_repository
        self._resources = resource_probe

    def list_configs(
        self,
        *,
        config_type: str | None,
        is_system: bool | None,
    ) -> list[SystemConfigItem]:
        normalized_type = config_type.upper() if config_type else None
        return self._configs.list_configs(
            config_type=normalized_type,
            is_system=is_system,
        )

    def get_stats(self) -> SystemStats:
        counts = self._statistics.get_counts()
        resources = self._resources.sample()
        uptime_hours = int(resources.uptime_seconds // 3600)
        uptime_minutes = int((resources.uptime_seconds % 3600) // 60)
        return SystemStats(
            total_patients=counts.total_patients,
            total_studies=counts.total_studies,
            total_reports=counts.total_reports,
            active_users=counts.active_users,
            system_uptime=f"{uptime_hours}小时{uptime_minutes}分钟",
            cpu_usage=round(resources.cpu_percent, 1),
            memory_usage=round(resources.memory_percent, 1),
            disk_usage=round(resources.disk_percent, 1),
        )

    def get_health(self) -> SystemHealth:
        resources = self._resources.sample()
        database: HealthStatus = (
            "healthy" if self._statistics.database_is_healthy() else "unhealthy"
        )
        components: dict[str, HealthStatus] = {
            "database": database,
            "disk": resource_health(resources.disk_percent, 90, 95),
            "memory": resource_health(resources.memory_percent, 85, 95),
            "cpu": resource_health(resources.cpu_percent, 80, 95),
        }
        overall: HealthStatus = "healthy"
        for component in components.values():
            overall = merge_health_status(overall, component)
        return SystemHealth(
            status=overall,
            components=components,
            timestamp=datetime.now(),
        )
