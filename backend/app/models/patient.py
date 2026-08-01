"""
患者管理相关模型

包含患者、就诊记录、过敏史、病史等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
"""

from __future__ import annotations

import datetime as datetime_types
import enum
import typing

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, relationship

from .base import Base


# 枚举定义
class GenderEnum(str, enum.Enum):
    """性别枚举"""

    MALE = "MALE"
    FEMALE = "FEMALE"
    OTHER = "OTHER"
    UNKNOWN = "UNKNOWN"


class BloodTypeEnum(str, enum.Enum):
    """血型枚举"""

    A = "A"
    B = "B"
    AB = "AB"
    O = "O"
    UNKNOWN = "UNKNOWN"


class RhFactorEnum(str, enum.Enum):
    """RH因子枚举"""

    POSITIVE = "POSITIVE"
    NEGATIVE = "NEGATIVE"
    UNKNOWN = "UNKNOWN"


class MaritalStatusEnum(str, enum.Enum):
    """婚姻状况枚举"""

    SINGLE = "SINGLE"
    MARRIED = "MARRIED"
    DIVORCED = "DIVORCED"
    WIDOWED = "WIDOWED"
    UNKNOWN = "UNKNOWN"


class PatientStatusEnum(str, enum.Enum):
    """患者状态枚举"""

    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    DECEASED = "DECEASED"
    MERGED = "MERGED"


class VisitTypeEnum(str, enum.Enum):
    """就诊类型枚举"""

    OUTPATIENT = "OUTPATIENT"
    INPATIENT = "INPATIENT"
    EMERGENCY = "EMERGENCY"
    PHYSICAL_EXAM = "PHYSICAL_EXAM"
    FOLLOW_UP = "FOLLOW_UP"


class VisitStatusEnum(str, enum.Enum):
    """就诊状态枚举"""

    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class SeverityEnum(str, enum.Enum):
    """严重程度枚举"""

    MILD = "MILD"
    MODERATE = "MODERATE"
    SEVERE = "SEVERE"
    CRITICAL = "CRITICAL"
    UNKNOWN = "UNKNOWN"


class Patient(Base):
    """患者表"""

    __tablename__ = "patients"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="患者ID"
    )
    patient_id: Mapped[typing.Any] = Column(
        String(50), unique=True, nullable=False, comment="患者编号"
    )
    hospital_id: Mapped[typing.Any] = Column(
        String(50), unique=True, comment="医院编号"
    )
    name: Mapped[typing.Any] = Column(String(100), nullable=False, comment="患者姓名")
    name_en: Mapped[typing.Any] = Column(String(200), comment="英文姓名")
    gender: Mapped[GenderEnum] = Column(
        Enum(GenderEnum), nullable=False, comment="性别"
    )
    birth_date: Mapped[datetime_types.date | None] = Column(Date, comment="出生日期")
    age: Mapped[int | None] = Column(Integer, comment="年龄")
    id_card: Mapped[typing.Any] = Column(String(18), unique=True, comment="身份证号")
    passport: Mapped[typing.Any] = Column(String(50), unique=True, comment="护照号")
    nationality: Mapped[typing.Any] = Column(String(50), comment="国籍")
    ethnicity: Mapped[typing.Any] = Column(String(50), comment="民族")
    phone: Mapped[typing.Any] = Column(String(20), comment="联系电话")
    phone_backup: Mapped[typing.Any] = Column(String(20), comment="备用电话")
    email: Mapped[typing.Any] = Column(String(100), comment="邮箱")
    address: Mapped[typing.Any] = Column(String(500), comment="地址")
    postal_code: Mapped[typing.Any] = Column(String(10), comment="邮编")
    emergency_contact_name: Mapped[typing.Any] = Column(
        String(100), comment="紧急联系人"
    )
    emergency_contact_phone: Mapped[typing.Any] = Column(
        String(20), comment="紧急联系电话"
    )
    emergency_contact_relation: Mapped[typing.Any] = Column(
        String(50), comment="紧急联系人关系"
    )
    blood_type: Mapped[BloodTypeEnum | None] = Column(
        Enum(BloodTypeEnum), comment="血型"
    )
    rh_factor: Mapped[RhFactorEnum | None] = Column(
        Enum(RhFactorEnum), comment="RH因子"
    )
    height: Mapped[typing.Any] = Column(Numeric(5, 2), comment="身高(cm)")
    weight: Mapped[typing.Any] = Column(Numeric(5, 2), comment="体重(kg)")
    bmi: Mapped[typing.Any] = Column(Numeric(5, 2), comment="BMI")
    marital_status: Mapped[MaritalStatusEnum | None] = Column(
        Enum(MaritalStatusEnum), comment="婚姻状况"
    )
    occupation: Mapped[typing.Any] = Column(String(100), comment="职业")
    education: Mapped[typing.Any] = Column(String(50), comment="学历")
    insurance_type: Mapped[typing.Any] = Column(String(50), comment="医保类型")
    insurance_number: Mapped[typing.Any] = Column(String(50), comment="医保号")
    status: Mapped[PatientStatusEnum] = Column(
        Enum(PatientStatusEnum),
        nullable=False,
        default=PatientStatusEnum.ACTIVE,
        comment="状态",
    )
    is_vip: Mapped[bool | None] = Column(Boolean, default=False, comment="是否VIP")
    is_high_risk: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否高危"
    )
    notes: Mapped[str | None] = Column(Text, comment="备注")
    tags: Mapped[typing.Any] = Column(JSON, comment="标签")
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    created_by: Mapped[int | None] = Column(Integer, comment="创建人ID")
    updated_by: Mapped[int | None] = Column(Integer, comment="更新人ID")
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(Integer, comment="删除人ID")

    # 关系
    visits: Mapped[list[PatientVisit]] = relationship(
        "PatientVisit", back_populates="patient"
    )
    allergies: Mapped[list[PatientAllergy]] = relationship(
        "PatientAllergy", back_populates="patient"
    )
    medical_history: Mapped[list[PatientMedicalHistory]] = relationship(
        "PatientMedicalHistory", back_populates="patient"
    )


class PatientVisit(Base):
    """患者就诊记录表"""

    __tablename__ = "patient_visits"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="就诊ID"
    )
    visit_number: Mapped[typing.Any] = Column(
        String(50), unique=True, nullable=False, comment="就诊号"
    )
    patient_id: Mapped[int] = Column(
        Integer, ForeignKey("patients.id"), nullable=False, comment="患者ID"
    )
    visit_type: Mapped[VisitTypeEnum] = Column(
        Enum(VisitTypeEnum), nullable=False, comment="就诊类型"
    )
    visit_date: Mapped[datetime_types.datetime] = Column(
        DateTime, nullable=False, comment="就诊时间"
    )
    department_id: Mapped[int | None] = Column(Integer, comment="科室ID")
    doctor_id: Mapped[int | None] = Column(Integer, comment="医生ID")
    status: Mapped[VisitStatusEnum] = Column(
        Enum(VisitStatusEnum), nullable=False, comment="就诊状态"
    )
    priority: Mapped[typing.Any] = Column(String(20), comment="优先级")
    chief_complaint: Mapped[str | None] = Column(Text, comment="主诉")
    present_illness: Mapped[str | None] = Column(Text, comment="现病史")
    diagnosis_preliminary: Mapped[str | None] = Column(Text, comment="初步诊断")
    diagnosis_final: Mapped[str | None] = Column(Text, comment="最终诊断")
    treatment_plan: Mapped[str | None] = Column(Text, comment="治疗方案")
    temperature: Mapped[typing.Any] = Column(Numeric(4, 1), comment="体温")
    blood_pressure_systolic: Mapped[int | None] = Column(Integer, comment="收缩压")
    blood_pressure_diastolic: Mapped[int | None] = Column(Integer, comment="舒张压")
    heart_rate: Mapped[int | None] = Column(Integer, comment="心率")
    respiratory_rate: Mapped[int | None] = Column(Integer, comment="呼吸频率")
    oxygen_saturation: Mapped[typing.Any] = Column(Numeric(5, 2), comment="血氧饱和度")
    total_cost: Mapped[typing.Any] = Column(Numeric(10, 2), comment="总费用")
    insurance_coverage: Mapped[typing.Any] = Column(Numeric(10, 2), comment="医保报销")
    self_payment: Mapped[typing.Any] = Column(Numeric(10, 2), comment="自费金额")
    notes: Mapped[str | None] = Column(Text, comment="备注")
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    created_by: Mapped[int | None] = Column(Integer, comment="创建人ID")
    updated_by: Mapped[int | None] = Column(Integer, comment="更新人ID")
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(Integer, comment="删除人ID")

    # 关系
    patient: Mapped[Patient] = relationship("Patient", back_populates="visits")


class PatientAllergy(Base):
    """患者过敏史表"""

    __tablename__ = "patient_allergies"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="过敏史ID"
    )
    patient_id: Mapped[int] = Column(
        Integer, ForeignKey("patients.id"), nullable=False, comment="患者ID"
    )
    allergen: Mapped[typing.Any] = Column(String(200), nullable=False, comment="过敏原")
    allergen_type: Mapped[typing.Any] = Column(String(50), comment="过敏原类型")
    reaction: Mapped[str | None] = Column(Text, comment="过敏反应")
    severity: Mapped[SeverityEnum | None] = Column(
        Enum(SeverityEnum), comment="严重程度"
    )
    onset_date: Mapped[datetime_types.date | None] = Column(Date, comment="发病日期")
    last_reaction_date: Mapped[datetime_types.date | None] = Column(
        Date, comment="最后反应日期"
    )
    is_active: Mapped[bool | None] = Column(Boolean, default=True, comment="是否活跃")
    verified: Mapped[bool | None] = Column(Boolean, default=False, comment="是否验证")
    notes: Mapped[str | None] = Column(Text, comment="备注")
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    created_by: Mapped[int | None] = Column(Integer, comment="创建人ID")
    updated_by: Mapped[int | None] = Column(Integer, comment="更新人ID")
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(Integer, comment="删除人ID")

    # 关系
    patient: Mapped[Patient] = relationship("Patient", back_populates="allergies")


class PatientMedicalHistory(Base):
    """患者病史表"""

    __tablename__ = "patient_medical_history"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="病史ID"
    )
    patient_id: Mapped[int] = Column(
        Integer, ForeignKey("patients.id"), nullable=False, comment="患者ID"
    )
    condition: Mapped[typing.Any] = Column(
        String(200), nullable=False, comment="疾病名称"
    )
    condition_code: Mapped[typing.Any] = Column(String(20), comment="疾病编码")
    category: Mapped[typing.Any] = Column(String(50), comment="疾病分类")
    onset_date: Mapped[datetime_types.date | None] = Column(Date, comment="发病日期")
    resolution_date: Mapped[datetime_types.date | None] = Column(
        Date, comment="治愈日期"
    )
    description: Mapped[str | None] = Column(Text, comment="描述")
    treatment: Mapped[str | None] = Column(Text, comment="治疗方案")
    outcome: Mapped[typing.Any] = Column(String(100), comment="治疗结果")
    is_chronic: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否慢性病"
    )
    is_hereditary: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否遗传病"
    )
    severity: Mapped[SeverityEnum | None] = Column(
        Enum(SeverityEnum), comment="严重程度"
    )
    related_family_member: Mapped[typing.Any] = Column(
        String(50), comment="相关家族成员"
    )
    notes: Mapped[str | None] = Column(Text, comment="备注")
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    updated_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), onupdate=func.now(), comment="更新时间"
    )
    created_by: Mapped[int | None] = Column(Integer, comment="创建人ID")
    updated_by: Mapped[int | None] = Column(Integer, comment="更新人ID")
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(Integer, comment="删除人ID")

    # 关系
    patient: Mapped[Patient] = relationship("Patient", back_populates="medical_history")
