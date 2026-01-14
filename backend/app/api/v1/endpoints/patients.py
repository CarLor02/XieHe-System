"""
患者管理API端点 - 重构版本

实现患者信息的增删改查功能，使用真实数据库操作

@author XieHe Medical System
@created 2025-09-28
"""
from app.services.patient_service import PatientService
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status  # 重命名以避免与参数冲突
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from pydantic import BaseModel, Field, validator
import uuid

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.exceptions import BusinessLogicException, ResourceNotFoundException
from app.core.logging import get_logger
from app.models.patient import Patient, GenderEnum, PatientStatusEnum

logger = get_logger(__name__)
router = APIRouter()

# Pydantic模型定义
class PatientBase(BaseModel):
    """患者基础信息模型"""
    patient_id: str = Field(..., description="患者编号", max_length=50)
    name: str = Field(..., description="患者姓名", max_length=100)
    gender: str = Field(..., description="性别")
    birth_date: Optional[date] = Field(None, description="出生日期")
    phone: Optional[str] = Field(None, description="联系电话", max_length=20)
    email: Optional[str] = Field(None, description="邮箱地址", max_length=100)
    address: Optional[str] = Field(None, description="联系地址", max_length=500)
    emergency_contact_name: Optional[str] = Field(None, description="紧急联系人", max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, description="紧急联系电话", max_length=20)
    id_card: Optional[str] = Field(None, description="身份证号", max_length=18)
    insurance_number: Optional[str] = Field(None, description="医保号", max_length=50)

class PatientCreate(PatientBase):
    """创建患者模型"""
    pass

class PatientUpdate(BaseModel):
    """更新患者模型"""
    name: Optional[str] = Field(None, description="患者姓名", max_length=100)
    gender: Optional[str] = Field(None, description="性别")
    birth_date: Optional[date] = Field(None, description="出生日期")
    phone: Optional[str] = Field(None, description="联系电话", max_length=20)
    email: Optional[str] = Field(None, description="邮箱地址", max_length=100)
    address: Optional[str] = Field(None, description="联系地址", max_length=500)
    emergency_contact_name: Optional[str] = Field(None, description="紧急联系人", max_length=100)
    emergency_contact_phone: Optional[str] = Field(None, description="紧急联系电话", max_length=20)
    id_card: Optional[str] = Field(None, description="身份证号", max_length=18)
    insurance_number: Optional[str] = Field(None, description="医保号", max_length=50)

class PatientResponse(BaseModel):
    """患者响应模型"""
    id: int
    patient_id: str
    name: str
    gender: str
    birth_date: Optional[date]
    age: Optional[int]
    phone: Optional[str]
    email: Optional[str]
    address: Optional[str]
    emergency_contact_name: Optional[str]
    emergency_contact_phone: Optional[str]
    id_card: Optional[str]
    insurance_number: Optional[str]
    status: str
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

class PatientListResponse(BaseModel):
    """患者列表响应模型"""
    patients: List[PatientResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# 辅助函数
def calculate_age_from_birth_date(birth_date: date) -> int:
    """根据出生日期计算年龄"""
    if not birth_date:
        return 0
    today = date.today()
    age = today.year - birth_date.year
    if today.month < birth_date.month or (today.month == birth_date.month and today.day < birth_date.day):
        age -= 1
    return age

def convert_gender_to_enum(gender_str: str) -> GenderEnum:
    """转换性别字符串为枚举"""
    gender_map = {
        "男": GenderEnum.MALE,
        "女": GenderEnum.FEMALE,
        "其他": GenderEnum.OTHER,
        "未知": GenderEnum.UNKNOWN,
        "male": GenderEnum.MALE,
        "female": GenderEnum.FEMALE,
        "other": GenderEnum.OTHER,
        "unknown": GenderEnum.UNKNOWN
    }
    return gender_map.get(gender_str.lower(), GenderEnum.UNKNOWN)

def convert_enum_to_gender(gender_enum: GenderEnum) -> str:
    """转换性别枚举为字符串"""
    gender_map = {
        GenderEnum.MALE: "男",
        GenderEnum.FEMALE: "女", 
        GenderEnum.OTHER: "其他",
        GenderEnum.UNKNOWN: "未知"
    }
    return gender_map.get(gender_enum, "未知")

# API端点
@router.post("/", response_model=PatientResponse, summary="创建患者")
@router.post("", response_model=PatientResponse, summary="创建患者")
async def create_patient(
    patient_data: PatientCreate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    创建新患者
    """
    try:
        # 检查患者ID是否已存在
        existing_patient = db.query(Patient).filter(
            and_(Patient.patient_id == patient_data.patient_id, Patient.is_deleted == False)
        ).first()
        
        if existing_patient:
            raise BusinessLogicException(f"患者ID {patient_data.patient_id} 已存在")

        # 创建新患者
        new_patient = Patient(
            patient_id=patient_data.patient_id,
            name=patient_data.name,
            gender=convert_gender_to_enum(patient_data.gender),
            birth_date=patient_data.birth_date,
            age=calculate_age_from_birth_date(patient_data.birth_date) if patient_data.birth_date else None,
            phone=patient_data.phone,
            email=patient_data.email,
            address=patient_data.address,
            emergency_contact_name=patient_data.emergency_contact_name,
            emergency_contact_phone=patient_data.emergency_contact_phone,
            id_card=patient_data.id_card,
            insurance_number=patient_data.insurance_number,
            status=PatientStatusEnum.ACTIVE,
            created_by=current_user.get("user_id") or current_user.get("id")
        )

        db.add(new_patient)
        db.commit()
        db.refresh(new_patient)

        logger.info(f"患者创建成功: {patient_data.patient_id} - {patient_data.name}")

        # 转换为响应模型
        response_data = {
            "id": new_patient.id,
            "patient_id": new_patient.patient_id,
            "name": new_patient.name,
            "gender": convert_enum_to_gender(new_patient.gender),
            "birth_date": new_patient.birth_date,
            "age": new_patient.age,
            "phone": new_patient.phone,
            "email": new_patient.email,
            "address": new_patient.address,
            "emergency_contact_name": new_patient.emergency_contact_name,
            "emergency_contact_phone": new_patient.emergency_contact_phone,
            "id_card": new_patient.id_card,
            "insurance_number": new_patient.insurance_number,
            "status": new_patient.status.value,
            "created_at": new_patient.created_at,
            "updated_at": new_patient.updated_at
        }

        return PatientResponse(**response_data)

    except BusinessLogicException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"患者创建失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者创建过程中发生错误"
        )

@router.get("/", response_model=PatientListResponse, summary="获取患者列表")
@router.get("", response_model=PatientListResponse, summary="获取患者列表")
async def get_patients(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词（姓名、患者ID、电话）"),
    gender: Optional[str] = Query(None, description="性别筛选"),
    age_min: Optional[int] = Query(None, ge=0, le=150, description="最小年龄"),
    age_max: Optional[int] = Query(None, ge=0, le=150, description="最大年龄"),
    status: Optional[str] = Query(None, description="状态筛选"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取患者列表（改用 Service 层，支持年龄区间）
    """
    try:
        # 用 Service 统一查
        patients = PatientService.list_patients(
            db=db,
            search=search,
            gender=gender,
            age_min=age_min,
            age_max=age_max,
            status=status,
            skip=(page - 1) * page_size,
            limit=page_size,
        )

        # 总数同样用 Service 的 count 方法（下面给实现）
        total = PatientService.count_patients(
            db=db,
            search=search,
            gender=gender,
            age_min=age_min,
            age_max=age_max,
            status=status,
        )

        # 组装返回
        patient_responses = []
        for patient in patients:
            response_data = {
                "id": patient.id,
                "patient_id": patient.patient_id,
                "name": patient.name,
                "gender": convert_enum_to_gender(patient.gender),
                "birth_date": patient.birth_date,
                "age": patient.age,
                "phone": patient.phone,
                "email": patient.email,
                "address": patient.address,
                "emergency_contact_name": patient.emergency_contact_name,
                "emergency_contact_phone": patient.emergency_contact_phone,
                "id_card": patient.id_card,
                "insurance_number": patient.insurance_number,
                "status": patient.status.value,
                "created_at": patient.created_at,
                "updated_at": patient.updated_at
            }
            patient_responses.append(PatientResponse(**response_data))

        total_pages = (total + page_size - 1) // page_size

        return PatientListResponse(
            patients=patient_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"获取患者列表失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取患者列表过程中发生错误"
        )
        return PatientListResponse(
            patients=patient_responses,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    except Exception as e:
        logger.error(f"获取患者列表失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取患者列表过程中发生错误"
        )

@router.get("/{patient_id}", response_model=PatientResponse, summary="获取患者详情")
async def get_patient(
    patient_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定患者的详细信息
    """
    try:
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.is_deleted == False)
        ).first()

        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 转换为响应格式
        response_data = {
            "id": patient.id,
            "patient_id": patient.patient_id,
            "name": patient.name,
            "gender": convert_enum_to_gender(patient.gender),
            "birth_date": patient.birth_date,
            "age": patient.age,
            "phone": patient.phone,
            "email": patient.email,
            "address": patient.address,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone,
            "id_card": patient.id_card,
            "insurance_number": patient.insurance_number,
            "status": patient.status.value,
            "created_at": patient.created_at,
            "updated_at": patient.updated_at
        }

        return PatientResponse(**response_data)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"获取患者详情失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取患者详情过程中发生错误"
        )

@router.put("/{patient_id}", response_model=PatientResponse, summary="更新患者信息")
async def update_patient(
    patient_id: int,
    patient_data: PatientUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新患者信息
    """
    try:
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.is_deleted == False)
        ).first()

        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 更新患者信息
        update_data = patient_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "gender" and value:
                setattr(patient, field, convert_gender_to_enum(value))
            elif field == "birth_date" and value:
                setattr(patient, field, value)
                setattr(patient, "age", calculate_age_from_birth_date(value))
            else:
                setattr(patient, field, value)

        patient.updated_by = current_user.get("user_id") or current_user.get("id")
        patient.updated_at = datetime.now()

        db.commit()
        db.refresh(patient)

        logger.info(f"患者信息更新成功: {patient.patient_id} - {patient.name}")

        # 转换为响应格式
        response_data = {
            "id": patient.id,
            "patient_id": patient.patient_id,
            "name": patient.name,
            "gender": convert_enum_to_gender(patient.gender),
            "birth_date": patient.birth_date,
            "age": patient.age,
            "phone": patient.phone,
            "email": patient.email,
            "address": patient.address,
            "emergency_contact_name": patient.emergency_contact_name,
            "emergency_contact_phone": patient.emergency_contact_phone,
            "id_card": patient.id_card,
            "insurance_number": patient.insurance_number,
            "status": patient.status.value,
            "created_at": patient.created_at,
            "updated_at": patient.updated_at
        }

        return PatientResponse(**response_data)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"患者信息更新失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者信息更新过程中发生错误"
        )

@router.delete("/{patient_id}", summary="删除患者")
async def delete_patient(
    patient_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    删除患者（软删除）
    """
    try:
        patient = db.query(Patient).filter(
            and_(Patient.id == patient_id, Patient.is_deleted == False)
        ).first()

        if not patient:
            raise ResourceNotFoundException(f"患者 ID {patient_id} 不存在")

        # 软删除
        patient.is_deleted = True
        patient.updated_by = current_user.get("id")
        patient.updated_at = datetime.now()

        db.commit()

        logger.info(f"患者删除成功: {patient.patient_id} - {patient.name}")

        return {"message": "患者删除成功"}

    except ResourceNotFoundException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"患者删除失败: {e}")
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="患者删除过程中发生错误"
        )
