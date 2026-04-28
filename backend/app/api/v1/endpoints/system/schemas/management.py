"""Schemas for the management API endpoints."""

from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pydantic import BaseModel

class SystemConfigResponse(BaseModel):
    config_key: str
    config_name: str
    config_value: str
    config_type: str
    data_type: str
    description: Optional[str] = None


class SystemStatsResponse(BaseModel):
    total_patients: int
    total_studies: int
    total_reports: int
    active_users: int
    system_uptime: str
    cpu_usage: float
    memory_usage: float
    disk_usage: float


class SystemHealthResponse(BaseModel):
    status: str
    components: dict
    timestamp: datetime
