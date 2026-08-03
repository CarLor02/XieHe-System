"""主机资源采样端口。"""

from typing import Protocol

from ..dto import ResourceUsage


class ResourceProbe(Protocol):
    def sample(self) -> ResourceUsage: ...
