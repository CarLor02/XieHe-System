"""Schemas for the health API endpoints."""

from typing import Dict, Any, List
from pydantic import BaseModel

class HealthStatus(BaseModel):
    status: str
    timestamp: str
    uptime: float
    version: str
    environment: str


class ComponentHealth(BaseModel):
    name: str
    status: str
    response_time: float
    details: Dict[str, Any]
    last_check: str


class SystemHealth(BaseModel):
    overall_status: str
    timestamp: str
    components: List[ComponentHealth]
    system_info: Dict[str, Any]
