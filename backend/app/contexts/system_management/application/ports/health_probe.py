"""Health-check infrastructure ports."""

from typing import Protocol

from ..dto import ComponentHealth, ComponentTestResult


class ComponentHealthProbe(Protocol):
    name: str

    async def check(self) -> ComponentHealth: ...

    async def test(self) -> ComponentTestResult | None: ...


class SystemMetricsProbe(Protocol):
    def metrics(self) -> dict[str, object]: ...

    def system_info(self) -> dict[str, object]: ...
