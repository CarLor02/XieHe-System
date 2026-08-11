"""Application orchestration for operational health checks."""

import asyncio
from datetime import datetime

from app.contexts.system_management.domain import HealthStatus, merge_health_status

from .dto import ComponentHealth, ComponentTestResult, DetailedHealth
from .ports import ComponentHealthProbe, SystemMetricsProbe


class UnknownHealthComponentError(LookupError):
    def __init__(self, component_name: str, available: list[str]) -> None:
        self.component_name = component_name
        self.available = available
        super().__init__(
            f"Component '{component_name}' not found. Available: {available}"
        )


class UnsupportedComponentTestError(LookupError):
    def __init__(self, component_name: str) -> None:
        self.component_name = component_name
        super().__init__(f"Test not available for component: {component_name}")


class HealthCheckApplicationService:
    def __init__(
        self,
        probes: list[ComponentHealthProbe],
        metrics_probe: SystemMetricsProbe,
    ) -> None:
        self._probes = {probe.name: probe for probe in probes}
        self._metrics = metrics_probe

    async def check_component(self, component_name: str) -> ComponentHealth:
        probe = self._probes.get(component_name)
        if probe is None:
            raise UnknownHealthComponentError(
                component_name, sorted(self._probes.keys())
            )
        return await probe.check()

    async def detailed(self) -> DetailedHealth:
        components = await asyncio.gather(
            *(probe.check() for probe in self._probes.values())
        )
        overall: HealthStatus = "healthy"
        for component in components:
            overall = merge_health_status(overall, component.status)
        return DetailedHealth(
            overall_status=overall,
            timestamp=datetime.now(),
            components=list(components),
            system_info=self._metrics.system_info(),
        )

    async def ready(self) -> bool:
        return (await self.check_component("database")).status != "unhealthy"

    async def test_component(self, component_name: str) -> ComponentTestResult:
        probe = self._probes.get(component_name)
        if probe is None:
            raise UnknownHealthComponentError(
                component_name, sorted(self._probes.keys())
            )
        result = await probe.test()
        if result is None:
            raise UnsupportedComponentTestError(component_name)
        return result

    def metrics(self) -> dict[str, object]:
        return self._metrics.metrics()
