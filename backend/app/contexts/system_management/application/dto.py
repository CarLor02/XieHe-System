"""系统管理应用层 DTO。"""

from dataclasses import dataclass, field
from datetime import datetime

from app.contexts.system_management.domain import HealthStatus


@dataclass(frozen=True, slots=True)
class SystemConfigItem:
    config_key: str
    config_name: str
    config_value: str
    config_type: str
    data_type: str
    description: str | None


@dataclass(frozen=True, slots=True)
class SystemCounts:
    total_patients: int
    total_studies: int
    total_reports: int
    active_users: int


@dataclass(frozen=True, slots=True)
class ResourceUsage:
    cpu_percent: float
    memory_percent: float
    disk_percent: float
    uptime_seconds: float


@dataclass(frozen=True, slots=True)
class SystemStats:
    total_patients: int
    total_studies: int
    total_reports: int
    active_users: int
    system_uptime: str
    cpu_usage: float
    memory_usage: float
    disk_usage: float


@dataclass(frozen=True, slots=True)
class SystemHealth:
    status: HealthStatus
    components: dict[str, HealthStatus]
    timestamp: datetime


@dataclass(frozen=True, slots=True)
class ComponentHealth:
    name: str
    status: HealthStatus
    response_time: float
    details: dict[str, object]
    last_check: datetime


@dataclass(frozen=True, slots=True)
class DetailedHealth:
    overall_status: HealthStatus
    timestamp: datetime
    components: list[ComponentHealth]
    system_info: dict[str, object]


@dataclass(frozen=True, slots=True)
class ComponentTestResult:
    component: str
    passed: bool
    details: dict[str, object] = field(default_factory=dict)
    error: str | None = None
