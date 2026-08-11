"""Host resource health and metrics adapters."""

import os
import platform
import time
from datetime import datetime

import psutil

from app.contexts.system_management.application.dto import ComponentHealth
from app.contexts.system_management.domain import HealthStatus


def _usage_status(value: float, warning_at: float, critical_at: float) -> HealthStatus:
    if value >= critical_at:
        return "critical"
    if value >= warning_at:
        return "warning"
    return "healthy"


class CpuHealthProbe:
    name = "cpu"

    async def check(self) -> ComponentHealth:
        started = time.perf_counter()
        try:
            percent = psutil.cpu_percent(interval=None)
            return ComponentHealth(
                name=self.name,
                status=_usage_status(percent, 80, 95),
                response_time=(time.perf_counter() - started) * 1000,
                details={
                    "usage_percent": percent,
                    "cpu_count": psutil.cpu_count(),
                    "load_average": list(psutil.getloadavg())
                    if hasattr(psutil, "getloadavg")
                    else None,
                },
                last_check=datetime.now(),
            )
        except Exception as exc:
            return _failed_component(self.name, started, exc)

    async def test(self) -> None:
        return None


class MemoryHealthProbe:
    name = "memory"

    async def check(self) -> ComponentHealth:
        started = time.perf_counter()
        try:
            memory = psutil.virtual_memory()
            return ComponentHealth(
                name=self.name,
                status=_usage_status(memory.percent, 85, 95),
                response_time=(time.perf_counter() - started) * 1000,
                details={
                    "usage_percent": memory.percent,
                    "available_gb": round(memory.available / (1024**3), 2),
                    "total_gb": round(memory.total / (1024**3), 2),
                },
                last_check=datetime.now(),
            )
        except Exception as exc:
            return _failed_component(self.name, started, exc)

    async def test(self) -> None:
        return None


class FileSystemHealthProbe:
    name = "filesystem"

    def __init__(self, upload_dir: str = "uploads") -> None:
        self._upload_dir = upload_dir

    async def check(self) -> ComponentHealth:
        started = time.perf_counter()
        try:
            disk = psutil.disk_usage("/")
            percent = (disk.used / disk.total) * 100
            upload_accessible = os.path.exists(self._upload_dir) and os.access(
                self._upload_dir, os.W_OK
            )
            return ComponentHealth(
                name=self.name,
                status="healthy" if percent < 90 and upload_accessible else "warning",
                response_time=(time.perf_counter() - started) * 1000,
                details={
                    "disk_usage_percent": round(percent, 2),
                    "upload_directory": "accessible"
                    if upload_accessible
                    else "inaccessible",
                    "free_space_gb": round(disk.free / (1024**3), 2),
                },
                last_check=datetime.now(),
            )
        except Exception as exc:
            return _failed_component(self.name, started, exc)

    async def test(self) -> None:
        return None


class HostMetricsProbe:
    def metrics(self) -> dict[str, object]:
        cpu_percent = psutil.cpu_percent(interval=None)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        network = psutil.net_io_counters()
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu": {"usage_percent": cpu_percent, "count": psutil.cpu_count()},
            "memory": {
                "usage_percent": memory.percent,
                "available_bytes": memory.available,
                "total_bytes": memory.total,
            },
            "disk": {
                "usage_percent": (disk.used / disk.total) * 100,
                "free_bytes": disk.free,
                "total_bytes": disk.total,
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv,
            },
        }

    def system_info(self) -> dict[str, object]:
        return {
            "platform": platform.system().lower(),
            "python_version": platform.python_version(),
            "boot_time": datetime.fromtimestamp(psutil.boot_time()).isoformat(),
            "process_count": len(psutil.pids()),
        }


def _failed_component(name: str, started: float, exc: Exception) -> ComponentHealth:
    return ComponentHealth(
        name=name,
        status="unhealthy",
        response_time=(time.perf_counter() - started) * 1000,
        details={"error": str(exc)},
        last_check=datetime.now(),
    )
