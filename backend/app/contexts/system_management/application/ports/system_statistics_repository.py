"""系统统计和数据库探活端口。"""

from typing import Protocol

from ..dto import SystemCounts


class SystemStatisticsRepository(Protocol):
    def get_counts(self) -> SystemCounts: ...

    def database_is_healthy(self) -> bool: ...
