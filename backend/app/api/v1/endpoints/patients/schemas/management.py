"""Schemas for the management API endpoints."""

from typing import List, Dict, Any, Optional
from datetime import datetime, date
from pydantic import BaseModel, Field, validator

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
