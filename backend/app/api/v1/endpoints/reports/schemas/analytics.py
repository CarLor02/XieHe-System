"""Schemas for the analytics API endpoints."""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum

class TimeRange(str, Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    CUSTOM = "custom"


class ChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"


class AnalyticsRequest(BaseModel):
    time_range: TimeRange = Field(..., description="时间范围")
    start_date: Optional[str] = Field(None, description="开始日期 YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="结束日期 YYYY-MM-DD")
    report_types: Optional[List[str]] = Field(None, description="报告类型筛选")
    departments: Optional[List[str]] = Field(None, description="科室筛选")
    doctors: Optional[List[str]] = Field(None, description="医生筛选")


class ReportStatistics(BaseModel):
    total_reports: int
    completed_reports: int
    pending_reports: int
    rejected_reports: int
    completion_rate: float
    average_completion_time: float  # 小时
    reports_by_type: Dict[str, int]
    reports_by_department: Dict[str, int]
    reports_by_status: Dict[str, int]


class DoctorWorkload(BaseModel):
    doctor_id: str
    doctor_name: str
    department: str
    total_reports: int
    completed_reports: int
    pending_reports: int
    average_completion_time: float
    efficiency_score: float
    workload_trend: List[Dict[str, Any]]


class PatientAnalytics(BaseModel):
    total_patients: int
    new_patients: int
    returning_patients: int
    patients_by_age_group: Dict[str, int]
    patients_by_gender: Dict[str, int]
    patients_by_department: Dict[str, int]
    patient_visit_frequency: Dict[str, int]


class TimeSeriesData(BaseModel):
    date: str
    value: Union[int, float]
    label: Optional[str] = None


class ChartData(BaseModel):
    chart_type: ChartType
    title: str
    x_axis_label: str
    y_axis_label: str
    data: List[TimeSeriesData]
    colors: Optional[List[str]] = None


class AnalyticsDashboard(BaseModel):
    overview: ReportStatistics
    doctor_workload: List[DoctorWorkload]
    patient_analytics: PatientAnalytics
    charts: List[ChartData]
    generated_at: datetime
