"""psutil 主机资源采样适配器。"""

from datetime import datetime

import psutil

from app.contexts.system_management.application.dto import ResourceUsage


class PsutilResourceProbe:
    def sample(self) -> ResourceUsage:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        return ResourceUsage(
            cpu_percent=psutil.cpu_percent(interval=None),
            memory_percent=memory.percent,
            disk_percent=disk.percent,
            uptime_seconds=max(0.0, datetime.now().timestamp() - psutil.boot_time()),
        )
