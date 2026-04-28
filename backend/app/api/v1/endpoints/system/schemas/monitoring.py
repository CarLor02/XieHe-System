"""Schemas for the monitoring API endpoints."""

from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class ThresholdUpdate(BaseModel):
    api_response_time: Optional[float] = None
    db_query_time: Optional[float] = None
    cpu_usage: Optional[float] = None
    memory_usage: Optional[float] = None
    disk_usage: Optional[float] = None


class MetricQuery(BaseModel):
    metric_type: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    limit: int = 1000


class SystemStatus(BaseModel):
    timestamp: str
    system: Dict[str, Any]
    api_performance: Dict[str, Any]
    database_performance: Dict[str, Any]
    thresholds: Dict[str, float]
    alerts: List[str]


class MetricPoint(BaseModel):
    timestamp: str
    metric_type: str
    metric_name: str
    value: float
    unit: str
    tags: Dict[str, str]
