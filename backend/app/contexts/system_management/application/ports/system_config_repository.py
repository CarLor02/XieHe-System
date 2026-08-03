"""系统配置读取端口。"""

from typing import Protocol

from ..dto import SystemConfigItem


class SystemConfigRepository(Protocol):
    def list_configs(
        self,
        *,
        config_type: str | None,
        is_system: bool | None,
    ) -> list[SystemConfigItem]: ...
