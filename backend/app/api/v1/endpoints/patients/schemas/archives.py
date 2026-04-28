"""Schemas for the archives API endpoints."""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from pydantic import BaseModel, Field, validator
from app.models.patient import (
    Patient, PatientVisit, PatientAllergy, PatientMedicalHistory,
    VisitTypeEnum, SeverityEnum, GenderEnum, BloodTypeEnum
)

class PatientVisitBase(BaseModel):
    """就诊记录基础模型"""
    visit_number: str = Field(..., description="就诊号")
    visit_type: VisitTypeEnum = Field(..., description="就诊类型")
    visit_date: datetime = Field(..., description="就诊时间")
    department_id: Optional[int] = Field(None, description="科室ID")
    doctor_id: Optional[int] = Field(None, description="主治医生ID")
    chief_complaint: Optional[str] = Field(None, description="主诉")
    present_illness: Optional[str] = Field(None, description="现病史")
    diagnosis_preliminary: Optional[str] = Field(None, description="初步诊断")
    diagnosis_final: Optional[str] = Field(None, description="最终诊断")
    treatment_plan: Optional[str] = Field(None, description="治疗方案")
    prescription: Optional[str] = Field(None, description="处方")

    # 生命体征
    temperature: Optional[float] = Field(None, description="体温(°C)")
    blood_pressure_systolic: Optional[int] = Field(None, description="收缩压(mmHg)")
    blood_pressure_diastolic: Optional[int] = Field(None, description="舒张压(mmHg)")
    heart_rate: Optional[int] = Field(None, description="心率(次/分)")
    respiratory_rate: Optional[int] = Field(None, description="呼吸频率(次/分)")
    oxygen_saturation: Optional[float] = Field(None, description="血氧饱和度(%)")

    # 费用信息
    total_cost: Optional[float] = Field(None, description="总费用")
    insurance_coverage: Optional[float] = Field(None, description="医保报销")
    self_payment: Optional[float] = Field(None, description="自费金额")

    notes: Optional[str] = Field(None, description="就诊备注")


class PatientVisitCreate(PatientVisitBase):
    """创建就诊记录请求模型"""
    patient_id: int = Field(..., description="患者ID")


class PatientVisitUpdate(BaseModel):
    """更新就诊记录请求模型"""
    visit_type: Optional[VisitTypeEnum] = None
    visit_date: Optional[datetime] = None
    department_id: Optional[int] = None
    doctor_id: Optional[int] = None
    chief_complaint: Optional[str] = None
    present_illness: Optional[str] = None
    diagnosis_preliminary: Optional[str] = None
    diagnosis_final: Optional[str] = None
    treatment_plan: Optional[str] = None
    prescription: Optional[str] = None
    temperature: Optional[float] = None
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    oxygen_saturation: Optional[float] = None
    total_cost: Optional[float] = None
    insurance_coverage: Optional[float] = None
    self_payment: Optional[float] = None
    notes: Optional[str] = None


class PatientVisitResponse(PatientVisitBase):
    """就诊记录响应模型"""
    id: int
    patient_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientAllergyBase(BaseModel):
    """过敏史基础模型"""
    allergen: str = Field(..., description="过敏原")
    allergen_type: Optional[str] = Field(None, description="过敏原类型")
    reaction: Optional[str] = Field(None, description="过敏反应")
    severity: Optional[SeverityEnum] = Field(None, description="严重程度")
    onset_date: Optional[date] = Field(None, description="首次发现时间")
    last_reaction_date: Optional[date] = Field(None, description="最近一次反应时间")
    is_active: bool = Field(True, description="是否仍然过敏")
    verified: bool = Field(False, description="是否已验证")
    notes: Optional[str] = Field(None, description="备注信息")


class PatientAllergyCreate(PatientAllergyBase):
    """创建过敏史请求模型"""
    patient_id: int = Field(..., description="患者ID")


class PatientAllergyUpdate(BaseModel):
    """更新过敏史请求模型"""
    allergen: Optional[str] = None
    allergen_type: Optional[str] = None
    reaction: Optional[str] = None
    severity: Optional[SeverityEnum] = None
    onset_date: Optional[date] = None
    last_reaction_date: Optional[date] = None
    is_active: Optional[bool] = None
    verified: Optional[bool] = None
    notes: Optional[str] = None


class PatientAllergyResponse(PatientAllergyBase):
    """过敏史响应模型"""
    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientMedicalHistoryBase(BaseModel):
    """病史基础模型"""
    condition: str = Field(..., description="疾病/病症")
    condition_code: Optional[str] = Field(None, description="疾病编码(ICD-10)")
    category: Optional[str] = Field(None, description="病史类别")
    onset_date: Optional[date] = Field(None, description="发病时间")
    resolution_date: Optional[date] = Field(None, description="康复时间")
    description: Optional[str] = Field(None, description="详细描述")
    treatment: Optional[str] = Field(None, description="治疗情况")
    outcome: Optional[str] = Field(None, description="治疗结果")
    is_chronic: bool = Field(False, description="是否慢性病")
    is_hereditary: bool = Field(False, description="是否遗传性疾病")
    severity: Optional[SeverityEnum] = Field(None, description="严重程度")
    related_family_member: Optional[str] = Field(None, description="相关家族成员")
    notes: Optional[str] = Field(None, description="备注信息")


class PatientMedicalHistoryCreate(PatientMedicalHistoryBase):
    """创建病史请求模型"""
    patient_id: int = Field(..., description="患者ID")


class PatientMedicalHistoryUpdate(BaseModel):
    """更新病史请求模型"""
    condition: Optional[str] = None
    condition_code: Optional[str] = None
    category: Optional[str] = None
    onset_date: Optional[date] = None
    resolution_date: Optional[date] = None
    description: Optional[str] = None
    treatment: Optional[str] = None
    outcome: Optional[str] = None
    is_chronic: Optional[bool] = None
    is_hereditary: Optional[bool] = None
    severity: Optional[SeverityEnum] = None
    related_family_member: Optional[str] = None
    notes: Optional[str] = None


class PatientMedicalHistoryResponse(PatientMedicalHistoryBase):
    """病史响应模型"""
    id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PatientArchivesSummary(BaseModel):
    """患者档案摘要模型"""
    patient_id: int
    patient_name: str
    total_visits: int
    last_visit_date: Optional[datetime]
    total_allergies: int
    active_allergies: int
    total_medical_history: int
    chronic_conditions: int
    high_risk_conditions: int


class PaginatedResponse(BaseModel):
    """分页响应模型"""
    items: List[Any]
    total: int
    page: int
    page_size: int
    total_pages: int
