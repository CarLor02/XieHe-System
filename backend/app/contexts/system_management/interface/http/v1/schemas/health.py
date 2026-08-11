"""Schemas for operational health HTTP v1."""

from typing import Any

from pydantic import BaseModel


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
    details: dict[str, Any]
    last_check: str


class DetailedHealthResponse(BaseModel):
    overall_status: str
    timestamp: str
    components: list[ComponentHealthResponse]
    system_info: dict[str, Any]
