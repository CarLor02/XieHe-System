"""Schemas for the dashboard API endpoints."""

from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field

class DashboardOverview(BaseModel):
    """仪表板概览数据"""
    # 患者统计
    total_patients: int = Field(..., description="总患者数")
    new_patients_today: int = Field(..., description="今日新增患者")
    new_patients_week: int = Field(..., description="本周新增患者")
    active_patients: int = Field(..., description="活跃患者数")

    # 影像统计（原检查统计）
    total_images: int = Field(..., description="总影像数")
    images_today: int = Field(..., description="今日上传影像")
    images_week: int = Field(..., description="本周上传影像")
    pending_images: int = Field(..., description="待处理影像")
    processed_images: int = Field(..., description="已处理影像")

    # 系统统计
    completion_rate: float = Field(..., description="完成率")
    average_processing_time: float = Field(..., description="平均处理时间(小时)")
    system_alerts: int = Field(..., description="系统警告数")

    # 时间戳
    generated_at: datetime = Field(..., description="生成时间")


class RecentActivity(BaseModel):
    """最近活动"""
    id: int
    type: str  # patient, study, report
    title: str
    description: str
    timestamp: datetime
    status: str


class SystemMetric(BaseModel):
    """系统指标"""
    name: str
    value: float
    unit: str
    status: str  # normal, warning, critical
    trend: str  # up, down, stable


class DashboardStats(BaseModel):
    """仪表板统计数据"""
    overview: DashboardOverview
    recent_activities: List[RecentActivity]
    system_metrics: List[SystemMetric]
