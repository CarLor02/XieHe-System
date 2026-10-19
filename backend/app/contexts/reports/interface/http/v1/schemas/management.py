"""Schemas for the management API endpoints."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, Field


class ReportCreate(BaseModel):
    """创建报告模型"""

    patient_id: int = Field(..., description="患者ID")
    study_id: Optional[int] = Field(None, description="检查ID")
    template_id: Optional[int] = Field(None, description="模板ID")
    report_title: str = Field(..., description="报告标题", max_length=200)
    clinical_history: Optional[str] = Field(None, description="临床病史")
    examination_technique: Optional[str] = Field(None, description="检查技术")
    findings: Optional[str] = Field(None, description="检查所见")
    impression: Optional[str] = Field(None, description="诊断意见")
    recommendations: Optional[str] = Field(None, description="建议")
    primary_diagnosis: Optional[str] = Field(None, description="主要诊断")
    secondary_diagnosis: Optional[str] = Field(None, description="次要诊断")
    priority: Optional[str] = Field("normal", description="优先级")


class ReportUpdate(BaseModel):
    """更新报告模型"""

    report_title: Optional[str] = Field(None, description="报告标题", max_length=200)
    clinical_history: Optional[str] = Field(None, description="临床病史")
    examination_technique: Optional[str] = Field(None, description="检查技术")
    findings: Optional[str] = Field(None, description="检查所见")
    impression: Optional[str] = Field(None, description="诊断意见")
    recommendations: Optional[str] = Field(None, description="建议")
    primary_diagnosis: Optional[str] = Field(None, description="主要诊断")
    secondary_diagnosis: Optional[str] = Field(None, description="次要诊断")
    priority: Optional[str] = Field(None, description="优先级")


class ReportResponse(BaseModel):
    """报告响应模型"""

    id: int
    report_number: str
    patient_id: int
    patient_name: Optional[str]
    study_id: Optional[int]
    template_id: Optional[int]
    report_title: str
    clinical_history: Optional[str]
    examination_technique: Optional[str]
    findings: Optional[str]
    impression: Optional[str]
    recommendations: Optional[str]
    primary_diagnosis: Optional[str]
    secondary_diagnosis: Optional[str]
    priority: str
    status: str
    ai_assisted: bool
    ai_confidence: Optional[float]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    reviewed_by: Optional[str]
    reviewed_at: Optional[date]

    class Config:
        from_attributes = True


class ReportSummary(BaseModel):
    """列表只返回摘要，并包含独立的报告医生/日期；不能用详情模型过滤。"""

    id: int
    report_number: str
    patient_id: int
    patient_name: str
    study_id: int | None
    report_title: str
    status: str
    priority: str
    primary_diagnosis: str
    reporting_physician: str
    report_date: str
    created_at: str
    updated_at: str
