"""Schemas for operational health HTTP v1."""

from __future__ import annotations

from pydantic import BaseModel, JsonValue


class HealthStatusResponse(BaseModel):
    status: str
    timestamp: str
    uptime: float
    version: str
    environment: str


class ComponentHealthResponse(BaseModel):
    name: str
    status: str
    response_time: float
    # 组件各有诊断字段，值限定为 JSON，避免把任意 Python 对象暴露到协议。
    details: dict[str, JsonValue]
    last_check: str


class SystemInfoResult(BaseModel):
    platform: str
    python_version: str
    boot_time: str
    process_count: int


class DetailedHealthResponse(BaseModel):
    overall_status: str
    timestamp: str
    components: list[ComponentHealthResponse]
    system_info: SystemInfoResult


class ProbeStatusResult(BaseModel):
    status: str
    timestamp: str


class CpuMetricsResult(BaseModel):
    usage_percent: float
    count: int | None


class MemoryMetricsResult(BaseModel):
    usage_percent: float
    available_bytes: int
    total_bytes: int


class DiskMetricsResult(BaseModel):
    usage_percent: float
    free_bytes: int
    total_bytes: int


class NetworkMetricsResult(BaseModel):
    bytes_sent: int
    bytes_recv: int
    packets_sent: int
    packets_recv: int


class HealthMetricsResult(BaseModel):
    timestamp: str
    cpu: CpuMetricsResult
    memory: MemoryMetricsResult
    disk: DiskMetricsResult
    network: NetworkMetricsResult


class ComponentTestResult(BaseModel):
    component: str
    test_result: str
    details: dict[str, JsonValue] | None = None
    error: str | None = None
