#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
患者管理表初始化脚本

创建患者管理相关的数据库表并插入测试数据。
包含患者基本信息、就诊记录、过敏史、病史等表。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import sys
import os
import io

# 设置标准输出编码为UTF-8（解决Windows下emoji显示问题）
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
import secrets
import hashlib
from datetime import datetime, date, timedelta
from decimal import Decimal
from env_loader import load_project_env

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 加载项目拆分后的 dotenv 文件
load_project_env()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# 创建Base
Base = declarative_base()

# 重新定义模型以避免配置依赖
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey, Table, Index, UniqueConstraint, Enum, Numeric, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

# 从环境变量读取数据库配置
MYSQL_HOST = os.getenv("DB_HOST", "127.0.0.1")
MYSQL_PORT = int(os.getenv("DB_PORT", "3306"))
MYSQL_USER = os.getenv("DB_USER", "root")
MYSQL_PASSWORD = os.getenv("DB_PASSWORD", "123456")
MYSQL_DATABASE = os.getenv("DB_NAME", "medical_imaging_system")

# 构建数据库URL
DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    f"?charset=utf8mb4"
)

# 枚举定义
class GenderEnum(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNKNOWN = "unknown"

class BloodTypeEnum(str, enum.Enum):
    A = "A"
    B = "B"
    AB = "AB"
    O = "O"
    UNKNOWN = "unknown"

class RhFactorEnum(str, enum.Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    UNKNOWN = "unknown"

class MaritalStatusEnum(str, enum.Enum):
    SINGLE = "single"
    MARRIED = "married"
    DIVORCED = "divorced"
    WIDOWED = "widowed"
    UNKNOWN = "unknown"

class PatientStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    DECEASED = "deceased"
    MERGED = "merged"

class VisitStatusEnum(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"

class VisitTypeEnum(str, enum.Enum):
    OUTPATIENT = "outpatient"
    INPATIENT = "inpatient"
    EMERGENCY = "emergency"
    PHYSICAL_EXAM = "physical_exam"
    FOLLOW_UP = "follow_up"

class SeverityEnum(str, enum.Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"
    CRITICAL = "critical"
    UNKNOWN = "unknown"

# 简化的模型定义
class Patient(Base):
    __tablename__ = 'patients'
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(String(50), unique=True, nullable=False)
    hospital_id = Column(String(50), unique=True, nullable=True)
    name = Column(String(100), nullable=False)
    name_en = Column(String(200), nullable=True)
    gender = Column(Enum(GenderEnum), nullable=False)
    birth_date = Column(Date, nullable=True)
    age = Column(Integer, nullable=True)
    id_card = Column(String(18), unique=True, nullable=True)
    passport = Column(String(50), unique=True, nullable=True)
    nationality = Column(String(50), nullable=True)
    ethnicity = Column(String(50), nullable=True)
    phone = Column(String(20), nullable=True)
    phone_backup = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    address = Column(String(500), nullable=True)
    postal_code = Column(String(10), nullable=True)
    emergency_contact_name = Column(String(100), nullable=True)
    emergency_contact_phone = Column(String(20), nullable=True)
    emergency_contact_relation = Column(String(50), nullable=True)
    blood_type = Column(Enum(BloodTypeEnum), nullable=True)
    rh_factor = Column(Enum(RhFactorEnum), nullable=True)
    height = Column(Numeric(5, 2), nullable=True)
    weight = Column(Numeric(5, 2), nullable=True)
    bmi = Column(Numeric(5, 2), nullable=True)
    marital_status = Column(Enum(MaritalStatusEnum), nullable=True)
    occupation = Column(String(100), nullable=True)
    education = Column(String(50), nullable=True)
    insurance_type = Column(String(50), nullable=True)
    insurance_number = Column(String(50), nullable=True)
    status = Column(Enum(PatientStatusEnum), default=PatientStatusEnum.ACTIVE, nullable=False)
    is_vip = Column(Boolean, default=False)
    is_high_risk = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    visits = relationship("PatientVisit", back_populates="patient")
    allergies = relationship("PatientAllergy", back_populates="patient")
    medical_history = relationship("PatientMedicalHistory", back_populates="patient")

class PatientVisit(Base):
    __tablename__ = 'patient_visits'
    
    id = Column(Integer, primary_key=True)
    visit_number = Column(String(50), unique=True, nullable=False)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    visit_type = Column(Enum(VisitTypeEnum), nullable=False)
    visit_date = Column(DateTime, nullable=False)
    department_id = Column(Integer, nullable=True)
    doctor_id = Column(Integer, nullable=True)
    status = Column(Enum(VisitStatusEnum), default=VisitStatusEnum.SCHEDULED, nullable=False)
    priority = Column(String(20), default='normal')
    chief_complaint = Column(Text, nullable=True)
    present_illness = Column(Text, nullable=True)
    diagnosis_preliminary = Column(Text, nullable=True)
    diagnosis_final = Column(Text, nullable=True)
    treatment_plan = Column(Text, nullable=True)
    temperature = Column(Numeric(4, 1), nullable=True)
    blood_pressure_systolic = Column(Integer, nullable=True)
    blood_pressure_diastolic = Column(Integer, nullable=True)
    heart_rate = Column(Integer, nullable=True)
    respiratory_rate = Column(Integer, nullable=True)
    oxygen_saturation = Column(Numeric(5, 2), nullable=True)
    total_cost = Column(Numeric(10, 2), nullable=True)
    insurance_coverage = Column(Numeric(10, 2), nullable=True)
    self_payment = Column(Numeric(10, 2), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    patient = relationship("Patient", back_populates="visits")

class PatientAllergy(Base):
    __tablename__ = 'patient_allergies'
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    allergen = Column(String(200), nullable=False)
    allergen_type = Column(String(50), nullable=True)
    reaction = Column(Text, nullable=True)
    severity = Column(Enum(SeverityEnum), nullable=True)
    onset_date = Column(Date, nullable=True)
    last_reaction_date = Column(Date, nullable=True)
    is_active = Column(Boolean, default=True)
    verified = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    patient = relationship("Patient", back_populates="allergies")

class PatientMedicalHistory(Base):
    __tablename__ = 'patient_medical_history'
    
    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey('patients.id'), nullable=False)
    condition = Column(String(200), nullable=False)
    condition_code = Column(String(20), nullable=True)
    category = Column(String(50), nullable=True)
    onset_date = Column(Date, nullable=True)
    resolution_date = Column(Date, nullable=True)
    description = Column(Text, nullable=True)
    treatment = Column(Text, nullable=True)
    outcome = Column(String(100), nullable=True)
    is_chronic = Column(Boolean, default=False)
    is_hereditary = Column(Boolean, default=False)
    severity = Column(Enum(SeverityEnum), nullable=True)
    related_family_member = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    patient = relationship("Patient", back_populates="medical_history")


def calculate_age(birth_date):
    """计算年龄"""
    if not birth_date:
        return None
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


def calculate_bmi(height, weight):
    """计算BMI"""
    if not height or not weight:
        return None
    height_m = float(height) / 100  # 转换为米
    return round(float(weight) / (height_m * height_m), 2)


def main():
    print("🚀 开始初始化患者管理表...")
    print("=" * 60)
    
    try:
        # 创建数据库引擎
        engine = create_engine(DATABASE_URL, echo=True)
        
        # 创建会话
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = SessionLocal()
        
        print("🔧 初始化数据库表结构...")
        # 创建所有表
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表结构创建成功!")
        
        print("👥 初始化患者测试数据...")
        
        # 创建测试患者数据
        patients_data = [
            {
                'patient_id': 'P2025001',
                'hospital_id': 'XH2025001',
                'name': '张三',
                'name_en': 'Zhang San',
                'gender': GenderEnum.MALE,
                'birth_date': date(1985, 3, 15),
                'id_card': '110101198503150001',
                'nationality': '中国',
                'ethnicity': '汉族',
                'phone': '13800138001',
                'email': 'zhangsan@example.com',
                'address': '北京市朝阳区建国路1号',
                'postal_code': '100001',
                'emergency_contact_name': '李四',
                'emergency_contact_phone': '13800138002',
                'emergency_contact_relation': '配偶',
                'blood_type': BloodTypeEnum.A,
                'rh_factor': RhFactorEnum.POSITIVE,
                'height': Decimal('175.0'),
                'weight': Decimal('70.0'),
                'marital_status': MaritalStatusEnum.MARRIED,
                'occupation': '软件工程师',
                'education': '本科',
                'insurance_type': '职工医保',
                'insurance_number': 'BJ001234567890',
                'status': PatientStatusEnum.ACTIVE,
                'is_vip': False,
                'is_high_risk': False,
                'notes': '患者配合度良好',
                'tags': ['IT行业', '定期体检'],
                'created_by': 1
            },
            {
                'patient_id': 'P2025002',
                'hospital_id': 'XH2025002',
                'name': '王丽',
                'name_en': 'Wang Li',
                'gender': GenderEnum.FEMALE,
                'birth_date': date(1990, 7, 22),
                'id_card': '110101199007220002',
                'nationality': '中国',
                'ethnicity': '汉族',
                'phone': '13800138003',
                'email': 'wangli@example.com',
                'address': '北京市海淀区中关村大街2号',
                'postal_code': '100080',
                'emergency_contact_name': '王父',
                'emergency_contact_phone': '13800138004',
                'emergency_contact_relation': '父亲',
                'blood_type': BloodTypeEnum.B,
                'rh_factor': RhFactorEnum.POSITIVE,
                'height': Decimal('162.0'),
                'weight': Decimal('55.0'),
                'marital_status': MaritalStatusEnum.SINGLE,
                'occupation': '教师',
                'education': '硕士',
                'insurance_type': '职工医保',
                'insurance_number': 'BJ001234567891',
                'status': PatientStatusEnum.ACTIVE,
                'is_vip': True,
                'is_high_risk': False,
                'notes': '教育工作者，健康意识强',
                'tags': ['教育行业', 'VIP患者'],
                'created_by': 1
            },
            {
                'patient_id': 'P2025003',
                'hospital_id': 'XH2025003',
                'name': '李老先生',
                'name_en': 'Li Laoxiansheng',
                'gender': GenderEnum.MALE,
                'birth_date': date(1945, 12, 8),
                'id_card': '110101194512080003',
                'nationality': '中国',
                'ethnicity': '汉族',
                'phone': '13800138005',
                'address': '北京市西城区西单大街3号',
                'postal_code': '100032',
                'emergency_contact_name': '李小明',
                'emergency_contact_phone': '13800138006',
                'emergency_contact_relation': '儿子',
                'blood_type': BloodTypeEnum.O,
                'rh_factor': RhFactorEnum.POSITIVE,
                'height': Decimal('168.0'),
                'weight': Decimal('65.0'),
                'marital_status': MaritalStatusEnum.WIDOWED,
                'occupation': '退休',
                'education': '高中',
                'insurance_type': '城镇居民医保',
                'insurance_number': 'BJ001234567892',
                'status': PatientStatusEnum.ACTIVE,
                'is_vip': False,
                'is_high_risk': True,
                'notes': '高龄患者，有多种慢性病',
                'tags': ['高龄', '慢性病', '高危患者'],
                'created_by': 2
            }
        ]
        
        created_patients = []
        for patient_data in patients_data:
            # 计算年龄和BMI
            patient_data['age'] = calculate_age(patient_data['birth_date'])
            patient_data['bmi'] = calculate_bmi(patient_data['height'], patient_data['weight'])
            
            patient = Patient(**patient_data)
            session.add(patient)
            session.flush()  # 获取ID
            created_patients.append(patient)
            print(f"   创建患者: {patient.name} ({patient.patient_id}) - 年龄: {patient.age}")
        
        session.commit()
        
        print("🏥 初始化就诊记录数据...")
        
        # 创建就诊记录
        visits_data = [
            {
                'visit_number': 'V2025001001',
                'patient_id': created_patients[0].id,
                'visit_type': VisitTypeEnum.OUTPATIENT,
                'visit_date': datetime.now() - timedelta(days=7),
                'department_id': 5,  # 影像科
                'doctor_id': 3,  # 李影像医生
                'status': VisitStatusEnum.COMPLETED,
                'priority': 'normal',
                'chief_complaint': '胸部不适，咳嗽2周',
                'present_illness': '患者2周前开始出现胸部不适，伴有干咳，无发热',
                'diagnosis_preliminary': '疑似肺部感染',
                'diagnosis_final': '肺部炎症',
                'treatment_plan': '抗炎治疗，复查胸片',
                'temperature': Decimal('36.8'),
                'blood_pressure_systolic': 120,
                'blood_pressure_diastolic': 80,
                'heart_rate': 72,
                'respiratory_rate': 18,
                'oxygen_saturation': Decimal('98.5'),
                'total_cost': Decimal('350.00'),
                'insurance_coverage': Decimal('280.00'),
                'self_payment': Decimal('70.00'),
                'notes': '患者配合检查，建议一周后复查',
                'created_by': 3
            },
            {
                'visit_number': 'V2025002001',
                'patient_id': created_patients[1].id,
                'visit_type': VisitTypeEnum.PHYSICAL_EXAM,
                'visit_date': datetime.now() - timedelta(days=3),
                'department_id': 4,  # 医务部
                'doctor_id': 2,  # 张医生
                'status': VisitStatusEnum.COMPLETED,
                'priority': 'normal',
                'chief_complaint': '年度体检',
                'present_illness': '无特殊不适，定期体检',
                'diagnosis_preliminary': '健康体检',
                'diagnosis_final': '各项指标正常',
                'treatment_plan': '保持健康生活方式',
                'temperature': Decimal('36.5'),
                'blood_pressure_systolic': 110,
                'blood_pressure_diastolic': 70,
                'heart_rate': 68,
                'respiratory_rate': 16,
                'oxygen_saturation': Decimal('99.0'),
                'total_cost': Decimal('800.00'),
                'insurance_coverage': Decimal('600.00'),
                'self_payment': Decimal('200.00'),
                'notes': 'VIP患者，体检结果良好',
                'created_by': 2
            }
        ]
        
        for visit_data in visits_data:
            visit = PatientVisit(**visit_data)
            session.add(visit)
            print(f"   创建就诊记录: {visit.visit_number} - {visit.chief_complaint}")
        
        session.commit()
        
        print("🔴 初始化过敏史数据...")
        
        # 创建过敏史记录
        allergies_data = [
            {
                'patient_id': created_patients[0].id,
                'allergen': '青霉素',
                'allergen_type': 'drug',
                'reaction': '皮疹、瘙痒',
                'severity': SeverityEnum.MODERATE,
                'onset_date': date(2010, 5, 15),
                'last_reaction_date': date(2010, 5, 15),
                'is_active': True,
                'verified': True,
                'notes': '注射青霉素后出现过敏反应',
                'created_by': 1
            },
            {
                'patient_id': created_patients[1].id,
                'allergen': '海鲜',
                'allergen_type': 'food',
                'reaction': '荨麻疹、腹泻',
                'severity': SeverityEnum.MILD,
                'onset_date': date(2015, 8, 20),
                'last_reaction_date': date(2023, 12, 25),
                'is_active': True,
                'verified': True,
                'notes': '食用虾蟹类海鲜后出现过敏',
                'created_by': 2
            },
            {
                'patient_id': created_patients[2].id,
                'allergen': '花粉',
                'allergen_type': 'environment',
                'reaction': '打喷嚏、流鼻涕、眼痒',
                'severity': SeverityEnum.MILD,
                'onset_date': date(1980, 4, 10),
                'last_reaction_date': date(2024, 4, 15),
                'is_active': True,
                'verified': True,
                'notes': '春季花粉过敏，每年复发',
                'created_by': 2
            }
        ]
        
        for allergy_data in allergies_data:
            allergy = PatientAllergy(**allergy_data)
            session.add(allergy)
            print(f"   创建过敏记录: {allergy.allergen} - {allergy.severity.value}")
        
        session.commit()
        
        print("📋 初始化病史数据...")
        
        # 创建病史记录
        medical_history_data = [
            {
                'patient_id': created_patients[0].id,
                'condition': '高血压',
                'condition_code': 'I10',
                'category': 'past',
                'onset_date': date(2020, 3, 10),
                'description': '原发性高血压，血压控制良好',
                'treatment': '降压药物治疗',
                'outcome': '血压控制稳定',
                'is_chronic': True,
                'is_hereditary': True,
                'severity': SeverityEnum.MILD,
                'notes': '需要长期服药控制',
                'created_by': 1
            },
            {
                'patient_id': created_patients[2].id,
                'condition': '糖尿病',
                'condition_code': 'E11',
                'category': 'past',
                'onset_date': date(2015, 7, 5),
                'description': '2型糖尿病，血糖控制一般',
                'treatment': '胰岛素治疗+饮食控制',
                'outcome': '血糖波动较大',
                'is_chronic': True,
                'is_hereditary': False,
                'severity': SeverityEnum.MODERATE,
                'notes': '需要严格控制饮食',
                'created_by': 2
            },
            {
                'patient_id': created_patients[2].id,
                'condition': '冠心病',
                'condition_code': 'I25',
                'category': 'family',
                'onset_date': None,
                'description': '父亲有冠心病史',
                'treatment': None,
                'outcome': None,
                'is_chronic': False,
                'is_hereditary': True,
                'severity': SeverityEnum.UNKNOWN,
                'related_family_member': '父亲',
                'notes': '家族遗传史，需要定期检查',
                'created_by': 2
            }
        ]
        
        for history_data in medical_history_data:
            history = PatientMedicalHistory(**history_data)
            session.add(history)
            print(f"   创建病史记录: {history.condition} - {history.category}")
        
        session.commit()
        
        print("=" * 60)
        print("🎉 患者管理表初始化完成!")
        
        # 统计数据
        print("📊 数据统计:")
        patient_count = session.query(Patient).count()
        visit_count = session.query(PatientVisit).count()
        allergy_count = session.query(PatientAllergy).count()
        history_count = session.query(PatientMedicalHistory).count()
        
        print(f"   患者数量: {patient_count}")
        print(f"   就诊记录: {visit_count}")
        print(f"   过敏记录: {history_count}")
        print(f"   病史记录: {history_count}")
        
        print("\n👥 测试患者信息:")
        for patient in created_patients:
            print(f"   {patient.name} ({patient.patient_id}) - {patient.gender.value} - {patient.age}岁")
        
        session.close()
        
    except Exception as e:
        print(f"❌ 初始化失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = main()
    if success:
        print("\n✅ 患者管理表初始化成功!")
        print("🎯 系统已准备好进行患者管理功能开发!")
    else:
        print("\n❌ 患者管理表初始化失败!")
        sys.exit(1)
