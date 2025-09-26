"""
患者档案管理API端点

实现患者档案、就诊记录、病史管理、过敏史管理等功能的API接口。
包括完整的CRUD操作、高级查询、统计分析等功能。

作者: XieHe Medical System
创建时间: 2025-09-25
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query, Path, Body
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func, text
import json
from decimal import Decimal

from app.core.database import get_db
from app.models.patient import (
    Patient, PatientVisit, PatientAllergy, PatientMedicalHistory,
    VisitTypeEnum, SeverityEnum, GenderEnum, BloodTypeEnum
)

router = APIRouter()

# ==================== 数据模型定义 ====================

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

# ==================== 工具函数 ====================

def generate_visit_number() -> str:
    """生成就诊号"""
    from datetime import datetime
    import random
    now = datetime.now()
    return f"V{now.strftime('%Y%m%d')}{random.randint(1000, 9999)}"

# ==================== API端点 ====================

@router.get("/patients/{patient_id}/archives/summary", response_model=PatientArchivesSummary)
async def get_patient_archives_summary(
    patient_id: int = Path(..., description="患者ID"),
    db: Session = Depends(get_db)
):
    """获取患者档案摘要"""
    
    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")
    
    # 统计就诊记录
    visits_query = db.query(PatientVisit).filter(
        PatientVisit.patient_id == patient_id,
        PatientVisit.is_deleted == False
    )
    total_visits = visits_query.count()
    last_visit = visits_query.order_by(desc(PatientVisit.visit_date)).first()
    
    # 统计过敏史
    allergies_query = db.query(PatientAllergy).filter(
        PatientAllergy.patient_id == patient_id,
        PatientAllergy.is_deleted == False
    )
    total_allergies = allergies_query.count()
    active_allergies = allergies_query.filter(PatientAllergy.is_active == True).count()
    
    # 统计病史
    history_query = db.query(PatientMedicalHistory).filter(
        PatientMedicalHistory.patient_id == patient_id,
        PatientMedicalHistory.is_deleted == False
    )
    total_medical_history = history_query.count()
    chronic_conditions = history_query.filter(PatientMedicalHistory.is_chronic == True).count()
    high_risk_conditions = history_query.filter(
        PatientMedicalHistory.severity.in_([SeverityEnum.SEVERE, SeverityEnum.CRITICAL])
    ).count()
    
    return PatientArchivesSummary(
        patient_id=patient.id,
        patient_name=patient.name,
        total_visits=total_visits,
        last_visit_date=last_visit.visit_date if last_visit else None,
        total_allergies=total_allergies,
        active_allergies=active_allergies,
        total_medical_history=total_medical_history,
        chronic_conditions=chronic_conditions,
        high_risk_conditions=high_risk_conditions
    )

# ==================== 就诊记录管理 ====================

@router.get("/patients/{patient_id}/visits", response_model=PaginatedResponse)
async def get_patient_visits(
    patient_id: int = Path(..., description="患者ID"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    visit_type: Optional[VisitTypeEnum] = Query(None, description="就诊类型筛选"),
    date_from: Optional[date] = Query(None, description="开始日期"),
    date_to: Optional[date] = Query(None, description="结束日期"),
    db: Session = Depends(get_db)
):
    """获取患者就诊记录列表"""
    
    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")
    
    # 构建查询
    query = db.query(PatientVisit).filter(
        PatientVisit.patient_id == patient_id,
        PatientVisit.is_deleted == False
    )
    
    # 应用筛选条件
    if visit_type:
        query = query.filter(PatientVisit.visit_type == visit_type)
    
    if date_from:
        query = query.filter(PatientVisit.visit_date >= date_from)
    
    if date_to:
        query = query.filter(PatientVisit.visit_date <= date_to)
    
    # 排序
    query = query.order_by(desc(PatientVisit.visit_date))
    
    # 分页
    total = query.count()
    offset = (page - 1) * page_size
    visits = query.offset(offset).limit(page_size).all()
    
    # 转换为响应模型
    visit_responses = []
    for visit in visits:
        visit_dict = {
            "id": visit.id,
            "visit_number": visit.visit_number,
            "patient_id": visit.patient_id,
            "visit_type": visit.visit_type,
            "visit_date": visit.visit_date,
            "department_id": visit.department_id,
            "doctor_id": visit.doctor_id,
            "chief_complaint": visit.chief_complaint,
            "present_illness": visit.present_illness,
            "diagnosis_preliminary": visit.diagnosis_preliminary,
            "diagnosis_final": visit.diagnosis_final,
            "treatment_plan": visit.treatment_plan,
            "prescription": visit.prescription,
            "temperature": float(visit.temperature) if visit.temperature else None,
            "blood_pressure_systolic": visit.blood_pressure_systolic,
            "blood_pressure_diastolic": visit.blood_pressure_diastolic,
            "heart_rate": visit.heart_rate,
            "respiratory_rate": visit.respiratory_rate,
            "oxygen_saturation": float(visit.oxygen_saturation) if visit.oxygen_saturation else None,
            "total_cost": float(visit.total_cost) if visit.total_cost else None,
            "insurance_coverage": float(visit.insurance_coverage) if visit.insurance_coverage else None,
            "self_payment": float(visit.self_payment) if visit.self_payment else None,
            "notes": visit.notes,
            "status": visit.status.value if visit.status else "unknown",
            "created_at": visit.created_at,
            "updated_at": visit.updated_at
        }
        visit_responses.append(visit_dict)
    
    return PaginatedResponse(
        items=visit_responses,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )

@router.post("/patients/{patient_id}/visits", response_model=PatientVisitResponse)
async def create_patient_visit(
    patient_id: int = Path(..., description="患者ID"),
    visit_data: PatientVisitCreate = Body(..., description="就诊记录数据"),
    db: Session = Depends(get_db)
):
    """创建患者就诊记录"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    # 生成就诊号
    visit_number = generate_visit_number()

    # 创建就诊记录
    visit_dict = visit_data.dict()
    visit_dict['visit_number'] = visit_number
    visit_dict['patient_id'] = patient_id

    visit = PatientVisit(**visit_dict)
    db.add(visit)
    db.commit()
    db.refresh(visit)

    return PatientVisitResponse.from_orm(visit)

@router.get("/visits/{visit_id}", response_model=PatientVisitResponse)
async def get_visit_detail(
    visit_id: int = Path(..., description="就诊记录ID"),
    db: Session = Depends(get_db)
):
    """获取就诊记录详情"""

    visit = db.query(PatientVisit).filter(
        PatientVisit.id == visit_id,
        PatientVisit.is_deleted == False
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="就诊记录不存在")

    return PatientVisitResponse.from_orm(visit)

@router.put("/visits/{visit_id}", response_model=PatientVisitResponse)
async def update_visit(
    visit_id: int = Path(..., description="就诊记录ID"),
    visit_data: PatientVisitUpdate = Body(..., description="更新数据"),
    db: Session = Depends(get_db)
):
    """更新就诊记录"""

    visit = db.query(PatientVisit).filter(
        PatientVisit.id == visit_id,
        PatientVisit.is_deleted == False
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="就诊记录不存在")

    # 更新字段
    update_data = visit_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(visit, field, value)

    visit.updated_at = datetime.now()
    db.commit()
    db.refresh(visit)

    return PatientVisitResponse.from_orm(visit)

@router.delete("/visits/{visit_id}")
async def delete_visit(
    visit_id: int = Path(..., description="就诊记录ID"),
    db: Session = Depends(get_db)
):
    """删除就诊记录（软删除）"""

    visit = db.query(PatientVisit).filter(
        PatientVisit.id == visit_id,
        PatientVisit.is_deleted == False
    ).first()

    if not visit:
        raise HTTPException(status_code=404, detail="就诊记录不存在")

    # 软删除
    visit.is_deleted = True
    visit.deleted_at = datetime.now()
    db.commit()

    return {"message": "就诊记录删除成功"}

# ==================== 过敏史管理 ====================

@router.get("/patients/{patient_id}/allergies", response_model=List[PatientAllergyResponse])
async def get_patient_allergies(
    patient_id: int = Path(..., description="患者ID"),
    is_active: Optional[bool] = Query(None, description="是否仍然过敏"),
    allergen_type: Optional[str] = Query(None, description="过敏原类型"),
    severity: Optional[SeverityEnum] = Query(None, description="严重程度"),
    db: Session = Depends(get_db)
):
    """获取患者过敏史列表"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    # 构建查询
    query = db.query(PatientAllergy).filter(
        PatientAllergy.patient_id == patient_id,
        PatientAllergy.is_deleted == False
    )

    # 应用筛选条件
    if is_active is not None:
        query = query.filter(PatientAllergy.is_active == is_active)

    if allergen_type:
        query = query.filter(PatientAllergy.allergen_type == allergen_type)

    if severity:
        query = query.filter(PatientAllergy.severity == severity)

    # 排序
    query = query.order_by(desc(PatientAllergy.created_at))

    allergies = query.all()
    return [PatientAllergyResponse.from_orm(allergy) for allergy in allergies]

@router.post("/patients/{patient_id}/allergies", response_model=PatientAllergyResponse)
async def create_patient_allergy(
    patient_id: int = Path(..., description="患者ID"),
    allergy_data: PatientAllergyCreate = Body(..., description="过敏史数据"),
    db: Session = Depends(get_db)
):
    """创建患者过敏史记录"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    # 检查是否已存在相同过敏原
    existing_allergy = db.query(PatientAllergy).filter(
        PatientAllergy.patient_id == patient_id,
        PatientAllergy.allergen == allergy_data.allergen,
        PatientAllergy.is_deleted == False
    ).first()

    if existing_allergy:
        raise HTTPException(status_code=400, detail="该过敏原记录已存在")

    # 创建过敏史记录
    allergy_dict = allergy_data.dict()
    allergy_dict['patient_id'] = patient_id

    allergy = PatientAllergy(**allergy_dict)
    db.add(allergy)
    db.commit()
    db.refresh(allergy)

    return PatientAllergyResponse.from_orm(allergy)

@router.put("/allergies/{allergy_id}", response_model=PatientAllergyResponse)
async def update_allergy(
    allergy_id: int = Path(..., description="过敏史记录ID"),
    allergy_data: PatientAllergyUpdate = Body(..., description="更新数据"),
    db: Session = Depends(get_db)
):
    """更新过敏史记录"""

    allergy = db.query(PatientAllergy).filter(
        PatientAllergy.id == allergy_id,
        PatientAllergy.is_deleted == False
    ).first()

    if not allergy:
        raise HTTPException(status_code=404, detail="过敏史记录不存在")

    # 更新字段
    update_data = allergy_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(allergy, field, value)

    allergy.updated_at = datetime.now()
    db.commit()
    db.refresh(allergy)

    return PatientAllergyResponse.from_orm(allergy)

@router.delete("/allergies/{allergy_id}")
async def delete_allergy(
    allergy_id: int = Path(..., description="过敏史记录ID"),
    db: Session = Depends(get_db)
):
    """删除过敏史记录（软删除）"""

    allergy = db.query(PatientAllergy).filter(
        PatientAllergy.id == allergy_id,
        PatientAllergy.is_deleted == False
    ).first()

    if not allergy:
        raise HTTPException(status_code=404, detail="过敏史记录不存在")

    # 软删除
    allergy.is_deleted = True
    allergy.deleted_at = datetime.now()
    db.commit()

    return {"message": "过敏史记录删除成功"}

# ==================== 病史管理 ====================

@router.get("/patients/{patient_id}/medical-history", response_model=List[PatientMedicalHistoryResponse])
async def get_patient_medical_history(
    patient_id: int = Path(..., description="患者ID"),
    category: Optional[str] = Query(None, description="病史类别"),
    is_chronic: Optional[bool] = Query(None, description="是否慢性病"),
    is_hereditary: Optional[bool] = Query(None, description="是否遗传性疾病"),
    severity: Optional[SeverityEnum] = Query(None, description="严重程度"),
    db: Session = Depends(get_db)
):
    """获取患者病史列表"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    # 构建查询
    query = db.query(PatientMedicalHistory).filter(
        PatientMedicalHistory.patient_id == patient_id,
        PatientMedicalHistory.is_deleted == False
    )

    # 应用筛选条件
    if category:
        query = query.filter(PatientMedicalHistory.category == category)

    if is_chronic is not None:
        query = query.filter(PatientMedicalHistory.is_chronic == is_chronic)

    if is_hereditary is not None:
        query = query.filter(PatientMedicalHistory.is_hereditary == is_hereditary)

    if severity:
        query = query.filter(PatientMedicalHistory.severity == severity)

    # 排序
    query = query.order_by(desc(PatientMedicalHistory.onset_date))

    history = query.all()
    return [PatientMedicalHistoryResponse.from_orm(record) for record in history]

@router.post("/patients/{patient_id}/medical-history", response_model=PatientMedicalHistoryResponse)
async def create_patient_medical_history(
    patient_id: int = Path(..., description="患者ID"),
    history_data: PatientMedicalHistoryCreate = Body(..., description="病史数据"),
    db: Session = Depends(get_db)
):
    """创建患者病史记录"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    # 创建病史记录
    history_dict = history_data.dict()
    history_dict['patient_id'] = patient_id

    history = PatientMedicalHistory(**history_dict)
    db.add(history)
    db.commit()
    db.refresh(history)

    return PatientMedicalHistoryResponse.from_orm(history)

@router.put("/medical-history/{history_id}", response_model=PatientMedicalHistoryResponse)
async def update_medical_history(
    history_id: int = Path(..., description="病史记录ID"),
    history_data: PatientMedicalHistoryUpdate = Body(..., description="更新数据"),
    db: Session = Depends(get_db)
):
    """更新病史记录"""

    history = db.query(PatientMedicalHistory).filter(
        PatientMedicalHistory.id == history_id,
        PatientMedicalHistory.is_deleted == False
    ).first()

    if not history:
        raise HTTPException(status_code=404, detail="病史记录不存在")

    # 更新字段
    update_data = history_data.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(history, field, value)

    history.updated_at = datetime.now()
    db.commit()
    db.refresh(history)

    return PatientMedicalHistoryResponse.from_orm(history)

@router.delete("/medical-history/{history_id}")
async def delete_medical_history(
    history_id: int = Path(..., description="病史记录ID"),
    db: Session = Depends(get_db)
):
    """删除病史记录（软删除）"""

    history = db.query(PatientMedicalHistory).filter(
        PatientMedicalHistory.id == history_id,
        PatientMedicalHistory.is_deleted == False
    ).first()

    if not history:
        raise HTTPException(status_code=404, detail="病史记录不存在")

    # 软删除
    history.is_deleted = True
    history.deleted_at = datetime.now()
    db.commit()

    return {"message": "病史记录删除成功"}

# ==================== 统计分析 ====================

@router.get("/patients/{patient_id}/archives/statistics")
async def get_patient_archives_statistics(
    patient_id: int = Path(..., description="患者ID"),
    db: Session = Depends(get_db)
):
    """获取患者档案统计信息"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    # 就诊统计
    visits_stats = db.query(
        func.count(PatientVisit.id).label('total_visits'),
        func.count(func.distinct(func.date(PatientVisit.visit_date))).label('visit_days'),
        func.max(PatientVisit.visit_date).label('last_visit'),
        func.min(PatientVisit.visit_date).label('first_visit')
    ).filter(
        PatientVisit.patient_id == patient_id,
        PatientVisit.is_deleted == False
    ).first()

    # 按就诊类型统计
    visit_type_stats = db.query(
        PatientVisit.visit_type,
        func.count(PatientVisit.id).label('count')
    ).filter(
        PatientVisit.patient_id == patient_id,
        PatientVisit.is_deleted == False
    ).group_by(PatientVisit.visit_type).all()

    # 过敏史统计
    allergy_stats = db.query(
        func.count(PatientAllergy.id).label('total_allergies'),
        func.count(func.case([(PatientAllergy.is_active == True, 1)])).label('active_allergies'),
        func.count(func.case([(PatientAllergy.verified == True, 1)])).label('verified_allergies')
    ).filter(
        PatientAllergy.patient_id == patient_id,
        PatientAllergy.is_deleted == False
    ).first()

    # 按过敏原类型统计
    allergen_type_stats = db.query(
        PatientAllergy.allergen_type,
        func.count(PatientAllergy.id).label('count')
    ).filter(
        PatientAllergy.patient_id == patient_id,
        PatientAllergy.is_deleted == False,
        PatientAllergy.allergen_type.isnot(None)
    ).group_by(PatientAllergy.allergen_type).all()

    # 病史统计
    history_stats = db.query(
        func.count(PatientMedicalHistory.id).label('total_conditions'),
        func.count(func.case([(PatientMedicalHistory.is_chronic == True, 1)])).label('chronic_conditions'),
        func.count(func.case([(PatientMedicalHistory.is_hereditary == True, 1)])).label('hereditary_conditions')
    ).filter(
        PatientMedicalHistory.patient_id == patient_id,
        PatientMedicalHistory.is_deleted == False
    ).first()

    # 按病史类别统计
    history_category_stats = db.query(
        PatientMedicalHistory.category,
        func.count(PatientMedicalHistory.id).label('count')
    ).filter(
        PatientMedicalHistory.patient_id == patient_id,
        PatientMedicalHistory.is_deleted == False,
        PatientMedicalHistory.category.isnot(None)
    ).group_by(PatientMedicalHistory.category).all()

    return {
        "patient_info": {
            "id": patient.id,
            "name": patient.name,
            "patient_id": patient.patient_id
        },
        "visits": {
            "total_visits": visits_stats.total_visits or 0,
            "visit_days": visits_stats.visit_days or 0,
            "first_visit": visits_stats.first_visit,
            "last_visit": visits_stats.last_visit,
            "by_type": {stat.visit_type.value: stat.count for stat in visit_type_stats}
        },
        "allergies": {
            "total_allergies": allergy_stats.total_allergies or 0,
            "active_allergies": allergy_stats.active_allergies or 0,
            "verified_allergies": allergy_stats.verified_allergies or 0,
            "by_type": {stat.allergen_type: stat.count for stat in allergen_type_stats}
        },
        "medical_history": {
            "total_conditions": history_stats.total_conditions or 0,
            "chronic_conditions": history_stats.chronic_conditions or 0,
            "hereditary_conditions": history_stats.hereditary_conditions or 0,
            "by_category": {stat.category: stat.count for stat in history_category_stats}
        }
    }

# ==================== 批量操作 ====================

@router.post("/patients/{patient_id}/allergies/batch")
async def batch_create_allergies(
    patient_id: int = Path(..., description="患者ID"),
    allergies_data: List[PatientAllergyBase] = Body(..., description="批量过敏史数据"),
    db: Session = Depends(get_db)
):
    """批量创建过敏史记录"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    created_allergies = []
    for allergy_data in allergies_data:
        # 检查是否已存在相同过敏原
        existing_allergy = db.query(PatientAllergy).filter(
            PatientAllergy.patient_id == patient_id,
            PatientAllergy.allergen == allergy_data.allergen,
            PatientAllergy.is_deleted == False
        ).first()

        if not existing_allergy:
            allergy_dict = allergy_data.dict()
            allergy_dict['patient_id'] = patient_id

            allergy = PatientAllergy(**allergy_dict)
            db.add(allergy)
            created_allergies.append(allergy)

    db.commit()

    # 刷新所有创建的记录
    for allergy in created_allergies:
        db.refresh(allergy)

    return {
        "message": f"成功创建 {len(created_allergies)} 条过敏史记录",
        "created_count": len(created_allergies),
        "allergies": [PatientAllergyResponse.from_orm(allergy) for allergy in created_allergies]
    }

@router.post("/patients/{patient_id}/medical-history/batch")
async def batch_create_medical_history(
    patient_id: int = Path(..., description="患者ID"),
    history_data: List[PatientMedicalHistoryBase] = Body(..., description="批量病史数据"),
    db: Session = Depends(get_db)
):
    """批量创建病史记录"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    created_history = []
    for history_item in history_data:
        history_dict = history_item.dict()
        history_dict['patient_id'] = patient_id

        history = PatientMedicalHistory(**history_dict)
        db.add(history)
        created_history.append(history)

    db.commit()

    # 刷新所有创建的记录
    for history in created_history:
        db.refresh(history)

    return {
        "message": f"成功创建 {len(created_history)} 条病史记录",
        "created_count": len(created_history),
        "medical_history": [PatientMedicalHistoryResponse.from_orm(history) for history in created_history]
    }

# ==================== 导出功能 ====================

@router.get("/patients/{patient_id}/archives/export")
async def export_patient_archives(
    patient_id: int = Path(..., description="患者ID"),
    format: str = Query("json", description="导出格式: json, csv, pdf"),
    include_visits: bool = Query(True, description="是否包含就诊记录"),
    include_allergies: bool = Query(True, description="是否包含过敏史"),
    include_medical_history: bool = Query(True, description="是否包含病史"),
    db: Session = Depends(get_db)
):
    """导出患者档案数据"""

    # 检查患者是否存在
    patient = db.query(Patient).filter(Patient.id == patient_id, Patient.is_deleted == False).first()
    if not patient:
        raise HTTPException(status_code=404, detail="患者不存在")

    export_data = {
        "patient_info": {
            "id": patient.id,
            "patient_id": patient.patient_id,
            "name": patient.name,
            "gender": patient.gender.value if patient.gender else None,
            "birth_date": patient.birth_date.isoformat() if patient.birth_date else None,
            "age": patient.age,
            "phone": patient.phone,
            "email": patient.email,
            "address": patient.address,
            "blood_type": patient.blood_type.value if patient.blood_type else None,
            "height": float(patient.height) if patient.height else None,
            "weight": float(patient.weight) if patient.weight else None,
            "created_at": patient.created_at.isoformat() if patient.created_at else None
        },
        "export_info": {
            "export_time": datetime.now().isoformat(),
            "format": format,
            "includes": {
                "visits": include_visits,
                "allergies": include_allergies,
                "medical_history": include_medical_history
            }
        }
    }

    # 包含就诊记录
    if include_visits:
        visits = db.query(PatientVisit).filter(
            PatientVisit.patient_id == patient_id,
            PatientVisit.is_deleted == False
        ).order_by(desc(PatientVisit.visit_date)).all()

        export_data["visits"] = []
        for visit in visits:
            visit_data = {
                "id": visit.id,
                "visit_number": visit.visit_number,
                "visit_type": visit.visit_type.value if visit.visit_type else None,
                "visit_date": visit.visit_date.isoformat() if visit.visit_date else None,
                "chief_complaint": visit.chief_complaint,
                "diagnosis_preliminary": visit.diagnosis_preliminary,
                "diagnosis_final": visit.diagnosis_final,
                "treatment_plan": visit.treatment_plan,
                "prescription": visit.prescription,
                "temperature": float(visit.temperature) if visit.temperature else None,
                "blood_pressure_systolic": visit.blood_pressure_systolic,
                "blood_pressure_diastolic": visit.blood_pressure_diastolic,
                "heart_rate": visit.heart_rate,
                "total_cost": float(visit.total_cost) if visit.total_cost else None,
                "notes": visit.notes
            }
            export_data["visits"].append(visit_data)

    # 包含过敏史
    if include_allergies:
        allergies = db.query(PatientAllergy).filter(
            PatientAllergy.patient_id == patient_id,
            PatientAllergy.is_deleted == False
        ).order_by(desc(PatientAllergy.created_at)).all()

        export_data["allergies"] = []
        for allergy in allergies:
            allergy_data = {
                "id": allergy.id,
                "allergen": allergy.allergen,
                "allergen_type": allergy.allergen_type,
                "reaction": allergy.reaction,
                "severity": allergy.severity.value if allergy.severity else None,
                "onset_date": allergy.onset_date.isoformat() if allergy.onset_date else None,
                "last_reaction_date": allergy.last_reaction_date.isoformat() if allergy.last_reaction_date else None,
                "is_active": allergy.is_active,
                "verified": allergy.verified,
                "notes": allergy.notes
            }
            export_data["allergies"].append(allergy_data)

    # 包含病史
    if include_medical_history:
        history = db.query(PatientMedicalHistory).filter(
            PatientMedicalHistory.patient_id == patient_id,
            PatientMedicalHistory.is_deleted == False
        ).order_by(desc(PatientMedicalHistory.onset_date)).all()

        export_data["medical_history"] = []
        for record in history:
            history_data = {
                "id": record.id,
                "condition": record.condition,
                "condition_code": record.condition_code,
                "category": record.category,
                "onset_date": record.onset_date.isoformat() if record.onset_date else None,
                "resolution_date": record.resolution_date.isoformat() if record.resolution_date else None,
                "description": record.description,
                "treatment": record.treatment,
                "outcome": record.outcome,
                "is_chronic": record.is_chronic,
                "is_hereditary": record.is_hereditary,
                "severity": record.severity.value if record.severity else None,
                "related_family_member": record.related_family_member,
                "notes": record.notes
            }
            export_data["medical_history"].append(history_data)

    # 根据格式返回数据
    if format.lower() == "json":
        return export_data
    elif format.lower() == "csv":
        # 简化的CSV格式，实际项目中可以使用pandas或csv模块
        return {"message": "CSV导出功能开发中", "data": export_data}
    elif format.lower() == "pdf":
        # PDF导出功能，实际项目中可以使用reportlab
        return {"message": "PDF导出功能开发中", "data": export_data}
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式")

# ==================== 搜索功能 ====================

@router.get("/archives/search")
async def search_patient_archives(
    query: str = Query(..., description="搜索关键词"),
    search_type: str = Query("all", description="搜索类型: all, visits, allergies, medical_history"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db)
):
    """搜索患者档案信息"""

    results = {
        "query": query,
        "search_type": search_type,
        "results": {}
    }

    # 搜索就诊记录
    if search_type in ["all", "visits"]:
        visits_query = db.query(PatientVisit).join(Patient).filter(
            PatientVisit.is_deleted == False,
            Patient.is_deleted == False,
            or_(
                PatientVisit.chief_complaint.contains(query),
                PatientVisit.diagnosis_preliminary.contains(query),
                PatientVisit.diagnosis_final.contains(query),
                PatientVisit.treatment_plan.contains(query),
                Patient.name.contains(query)
            )
        ).order_by(desc(PatientVisit.visit_date))

        total_visits = visits_query.count()
        visits = visits_query.offset((page - 1) * page_size).limit(page_size).all()

        results["results"]["visits"] = {
            "total": total_visits,
            "items": [
                {
                    "id": visit.id,
                    "patient_name": visit.patient.name,
                    "patient_id": visit.patient.patient_id,
                    "visit_number": visit.visit_number,
                    "visit_date": visit.visit_date.isoformat() if visit.visit_date else None,
                    "chief_complaint": visit.chief_complaint,
                    "diagnosis_final": visit.diagnosis_final
                }
                for visit in visits
            ]
        }

    # 搜索过敏史
    if search_type in ["all", "allergies"]:
        allergies_query = db.query(PatientAllergy).join(Patient).filter(
            PatientAllergy.is_deleted == False,
            Patient.is_deleted == False,
            or_(
                PatientAllergy.allergen.contains(query),
                PatientAllergy.reaction.contains(query),
                Patient.name.contains(query)
            )
        ).order_by(desc(PatientAllergy.created_at))

        total_allergies = allergies_query.count()
        allergies = allergies_query.offset((page - 1) * page_size).limit(page_size).all()

        results["results"]["allergies"] = {
            "total": total_allergies,
            "items": [
                {
                    "id": allergy.id,
                    "patient_name": allergy.patient.name,
                    "patient_id": allergy.patient.patient_id,
                    "allergen": allergy.allergen,
                    "reaction": allergy.reaction,
                    "severity": allergy.severity.value if allergy.severity else None,
                    "is_active": allergy.is_active
                }
                for allergy in allergies
            ]
        }

    # 搜索病史
    if search_type in ["all", "medical_history"]:
        history_query = db.query(PatientMedicalHistory).join(Patient).filter(
            PatientMedicalHistory.is_deleted == False,
            Patient.is_deleted == False,
            or_(
                PatientMedicalHistory.condition.contains(query),
                PatientMedicalHistory.description.contains(query),
                PatientMedicalHistory.treatment.contains(query),
                Patient.name.contains(query)
            )
        ).order_by(desc(PatientMedicalHistory.onset_date))

        total_history = history_query.count()
        history = history_query.offset((page - 1) * page_size).limit(page_size).all()

        results["results"]["medical_history"] = {
            "total": total_history,
            "items": [
                {
                    "id": record.id,
                    "patient_name": record.patient.name,
                    "patient_id": record.patient.patient_id,
                    "condition": record.condition,
                    "category": record.category,
                    "onset_date": record.onset_date.isoformat() if record.onset_date else None,
                    "is_chronic": record.is_chronic,
                    "severity": record.severity.value if record.severity else None
                }
                for record in history
            ]
        }

    return results
