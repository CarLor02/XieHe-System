#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
诊断报告表初始化脚本

创建诊断报告相关的数据库表并插入测试数据。
包含报告模板、诊断报告、报告所见、修订历史等表。

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
import uuid
from dotenv import load_dotenv

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 加载backend目录下的.env文件
env_path = os.path.join(project_root, '.env')
load_dotenv(env_path)

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# 创建Base
Base = declarative_base()

# 重新定义模型以避免配置依赖
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Date, ForeignKey, Enum, JSON, Float
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
class ReportStatusEnum(str, enum.Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    FINALIZED = "finalized"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"

class ReportTypeEnum(str, enum.Enum):
    RADIOLOGY = "radiology"
    PATHOLOGY = "pathology"
    LABORATORY = "laboratory"
    ULTRASOUND = "ultrasound"
    ENDOSCOPY = "endoscopy"
    ECG = "ecg"
    OTHER = "other"

class ReportPriorityEnum(str, enum.Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"
    STAT = "stat"

class DiagnosisLevelEnum(str, enum.Enum):
    NORMAL = "normal"
    ABNORMAL = "abnormal"
    SUSPICIOUS = "suspicious"
    MALIGNANT = "malignant"
    BENIGN = "benign"
    INDETERMINATE = "indeterminate"

class TemplateTypeEnum(str, enum.Enum):
    STRUCTURED = "structured"
    FREE_TEXT = "free_text"
    HYBRID = "hybrid"
    CHECKLIST = "checklist"

# 简化的模型定义
class ReportTemplate(Base):
    __tablename__ = 'report_templates'
    
    id = Column(Integer, primary_key=True)
    template_name = Column(String(100), nullable=False)
    template_code = Column(String(50), unique=True, nullable=False)
    template_type = Column(Enum(TemplateTypeEnum), nullable=False)
    report_type = Column(Enum(ReportTypeEnum), nullable=False)
    modality = Column(String(20), nullable=True)
    body_part = Column(String(50), nullable=True)
    template_content = Column(JSON, nullable=False)
    default_values = Column(JSON, nullable=True)
    validation_rules = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    is_default = Column(Boolean, default=False)
    version = Column(String(20), default='1.0')
    description = Column(Text, nullable=True)
    usage_count = Column(Integer, default=0)
    last_used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    reports = relationship("DiagnosticReport", back_populates="template")

class DiagnosticReport(Base):
    __tablename__ = 'diagnostic_reports'
    
    id = Column(Integer, primary_key=True)
    report_number = Column(String(50), unique=True, nullable=False)
    study_id = Column(Integer, nullable=False)
    patient_id = Column(Integer, nullable=False)
    template_id = Column(Integer, ForeignKey('report_templates.id'), nullable=True)
    report_type = Column(Enum(ReportTypeEnum), nullable=False)
    report_title = Column(String(200), nullable=False)
    status = Column(Enum(ReportStatusEnum), default=ReportStatusEnum.DRAFT, nullable=False)
    priority = Column(Enum(ReportPriorityEnum), default=ReportPriorityEnum.NORMAL)
    clinical_history = Column(Text, nullable=True)
    examination_technique = Column(Text, nullable=True)
    findings = Column(Text, nullable=False)
    impression = Column(Text, nullable=False)
    recommendations = Column(Text, nullable=True)
    structured_data = Column(JSON, nullable=True)
    measurements = Column(JSON, nullable=True)
    annotations = Column(JSON, nullable=True)
    primary_diagnosis = Column(String(200), nullable=True)
    secondary_diagnosis = Column(Text, nullable=True)
    diagnosis_codes = Column(JSON, nullable=True)
    diagnosis_level = Column(Enum(DiagnosisLevelEnum), nullable=True)
    confidence_score = Column(Float, nullable=True)
    examination_date = Column(Date, nullable=True)
    report_date = Column(Date, nullable=False)
    reviewed_date = Column(Date, nullable=True)
    finalized_date = Column(Date, nullable=True)
    reporting_physician = Column(String(100), nullable=False)
    reviewing_physician = Column(String(100), nullable=True)
    attending_physician = Column(String(100), nullable=True)
    ai_assisted = Column(Boolean, default=False)
    ai_suggestions = Column(JSON, nullable=True)
    ai_confidence = Column(Float, nullable=True)
    quality_score = Column(Float, nullable=True)
    quality_notes = Column(Text, nullable=True)
    urgency_flag = Column(Boolean, default=False)
    critical_flag = Column(Boolean, default=False)
    follow_up_required = Column(Boolean, default=False)
    follow_up_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    template = relationship("ReportTemplate", back_populates="reports")
    findings_items = relationship("ReportFinding", back_populates="report")
    revisions = relationship("ReportRevision", back_populates="report")

class ReportFinding(Base):
    __tablename__ = 'report_findings'
    
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey('diagnostic_reports.id'), nullable=False)
    finding_category = Column(String(100), nullable=False)
    finding_description = Column(Text, nullable=False)
    location = Column(String(100), nullable=True)
    severity = Column(String(50), nullable=True)
    measurements = Column(JSON, nullable=True)
    coordinates = Column(JSON, nullable=True)
    significance = Column(String(100), nullable=True)
    differential_diagnosis = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    is_key_finding = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    report = relationship("DiagnosticReport", back_populates="findings_items")

class ReportRevision(Base):
    __tablename__ = 'report_revisions'
    
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey('diagnostic_reports.id'), nullable=False)
    revision_number = Column(Integer, nullable=False)
    revision_reason = Column(String(200), nullable=False)
    revision_description = Column(Text, nullable=True)
    previous_content = Column(JSON, nullable=False)
    current_content = Column(JSON, nullable=False)
    changed_fields = Column(JSON, nullable=True)
    revised_by = Column(Integer, nullable=False)
    revised_at = Column(DateTime, default=func.now())
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    is_deleted = Column(Boolean, default=False)
    deleted_at = Column(DateTime, nullable=True)
    deleted_by = Column(Integer, nullable=True)
    
    report = relationship("DiagnosticReport", back_populates="revisions")


def generate_report_number():
    """生成报告编号"""
    today = datetime.now().strftime("%Y%m%d")
    random_part = secrets.randbelow(9999)
    return f"RPT{today}{random_part:04d}"


def main():
    print("🚀 开始初始化诊断报告表...")
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
        
        print("📋 初始化报告模板数据...")
        
        # 创建报告模板数据
        templates_data = [
            {
                'template_name': '胸部CT报告模板',
                'template_code': 'CHEST_CT_001',
                'template_type': TemplateTypeEnum.STRUCTURED,
                'report_type': ReportTypeEnum.RADIOLOGY,
                'modality': 'CT',
                'body_part': '胸部',
                'template_content': {
                    'sections': [
                        {
                            'name': '临床病史',
                            'type': 'textarea',
                            'required': False,
                            'placeholder': '请输入患者临床病史...'
                        },
                        {
                            'name': '检查技术',
                            'type': 'select',
                            'required': True,
                            'options': ['平扫', '增强', '平扫+增强']
                        },
                        {
                            'name': '检查所见',
                            'type': 'structured',
                            'fields': [
                                {'name': '肺窗', 'type': 'textarea'},
                                {'name': '纵隔窗', 'type': 'textarea'},
                                {'name': '骨窗', 'type': 'textarea'}
                            ]
                        },
                        {
                            'name': '诊断意见',
                            'type': 'textarea',
                            'required': True
                        }
                    ]
                },
                'default_values': {
                    'examination_technique': '胸部CT平扫'
                },
                'is_active': True,
                'is_default': True,
                'description': '标准胸部CT诊断报告模板',
                'created_by': 3
            },
            {
                'template_name': '头颅MRI报告模板',
                'template_code': 'BRAIN_MRI_001',
                'template_type': TemplateTypeEnum.STRUCTURED,
                'report_type': ReportTypeEnum.RADIOLOGY,
                'modality': 'MR',
                'body_part': '头颅',
                'template_content': {
                    'sections': [
                        {
                            'name': '临床病史',
                            'type': 'textarea',
                            'required': False
                        },
                        {
                            'name': '检查序列',
                            'type': 'checklist',
                            'options': ['T1WI', 'T2WI', 'FLAIR', 'DWI', 'T1WI增强']
                        },
                        {
                            'name': '检查所见',
                            'type': 'structured',
                            'fields': [
                                {'name': '脑实质', 'type': 'textarea'},
                                {'name': '脑室系统', 'type': 'textarea'},
                                {'name': '脑血管', 'type': 'textarea'}
                            ]
                        }
                    ]
                },
                'is_active': True,
                'is_default': True,
                'description': '标准头颅MRI诊断报告模板',
                'created_by': 3
            }
        ]
        
        created_templates = []
        for template_data in templates_data:
            template = ReportTemplate(**template_data)
            session.add(template)
            session.flush()
            created_templates.append(template)
            print(f"   创建模板: {template.template_name} ({template.template_code})")
        
        session.commit()
        
        print("📄 初始化诊断报告数据...")
        
        # 创建诊断报告数据
        reports_data = [
            {
                'report_number': generate_report_number(),
                'study_id': 1,  # 胸部CT检查
                'patient_id': 1,  # 张三
                'template_id': created_templates[0].id,
                'report_type': ReportTypeEnum.RADIOLOGY,
                'report_title': '胸部CT平扫诊断报告',
                'status': ReportStatusEnum.FINALIZED,
                'priority': ReportPriorityEnum.NORMAL,
                'clinical_history': '患者主诉胸闷气短2周，既往有高血压病史。',
                'examination_technique': '胸部CT平扫，层厚5mm，重建层厚1.25mm。',
                'findings': '''肺窗：双肺纹理增粗，右上肺见一类圆形结节影，直径约8mm，边界清楚，密度均匀。余肺野未见明显实质性病变。
纵隔窗：纵隔居中，心影大小正常，主动脉弓钙化。纵隔内未见肿大淋巴结。
骨窗：所示骨质未见明显异常。''',
                'impression': '右上肺结节，考虑良性病变可能性大，建议随访观察。',
                'recommendations': '建议3-6个月后复查胸部CT，观察结节变化。',
                'primary_diagnosis': '右上肺结节',
                'diagnosis_codes': ['R91.1'],
                'diagnosis_level': DiagnosisLevelEnum.SUSPICIOUS,
                'confidence_score': 0.85,
                'examination_date': date.today() - timedelta(days=1),
                'report_date': date.today(),
                'finalized_date': date.today(),
                'reporting_physician': '李影像医生',
                'reviewing_physician': '张主任医师',
                'ai_assisted': True,
                'ai_suggestions': {
                    'nodule_detection': {
                        'detected': True,
                        'location': '右上肺',
                        'size': '8.2mm',
                        'confidence': 0.89
                    }
                },
                'ai_confidence': 0.89,
                'quality_score': 9.2,
                'urgency_flag': False,
                'critical_flag': False,
                'follow_up_required': True,
                'follow_up_date': date.today() + timedelta(days=90),
                'tags': ['肺结节', 'AI辅助', '随访'],
                'created_by': 3
            },
            {
                'report_number': generate_report_number(),
                'study_id': 2,  # 头颅MRI检查
                'patient_id': 2,  # 王丽
                'template_id': created_templates[1].id,
                'report_type': ReportTypeEnum.RADIOLOGY,
                'report_title': '头颅MRI增强诊断报告',
                'status': ReportStatusEnum.IN_REVIEW,
                'priority': ReportPriorityEnum.HIGH,
                'clinical_history': 'VIP患者，主诉头痛伴恶心呕吐1周，既往体健。',
                'examination_technique': '头颅MRI平扫+增强扫描，包括T1WI、T2WI、FLAIR、DWI序列。',
                'findings': '''脑实质：双侧大脑半球脑实质信号正常，未见异常信号影。脑沟、脑裂未见增宽。
脑室系统：侧脑室、第三脑室、第四脑室大小形态正常，中线结构居中。
脑血管：增强扫描显示脑血管走行正常，未见异常强化。''',
                'impression': '头颅MRI检查未见明显异常。',
                'recommendations': '结合临床症状，建议进一步检查排除其他原因。',
                'primary_diagnosis': '头颅MRI未见异常',
                'diagnosis_level': DiagnosisLevelEnum.NORMAL,
                'confidence_score': 0.95,
                'examination_date': date.today(),
                'report_date': date.today(),
                'reporting_physician': '李影像医生',
                'ai_assisted': True,
                'ai_suggestions': {
                    'brain_segmentation': {
                        'completed': False,
                        'progress': 65,
                        'preliminary_findings': 'No obvious abnormalities detected'
                    }
                },
                'ai_confidence': 0.92,
                'urgency_flag': False,
                'critical_flag': False,
                'tags': ['VIP', 'MRI', '头痛'],
                'created_by': 3
            }
        ]
        
        created_reports = []
        for report_data in reports_data:
            report = DiagnosticReport(**report_data)
            session.add(report)
            session.flush()
            created_reports.append(report)
            print(f"   创建报告: {report.report_title} ({report.report_number}) - {report.status.value}")
        
        session.commit()
        
        print("🔍 初始化报告所见数据...")
        
        # 创建报告所见数据
        findings_data = [
            {
                'report_id': created_reports[0].id,
                'finding_category': '肺部病变',
                'finding_description': '右上肺类圆形结节影，直径约8mm，边界清楚，密度均匀',
                'location': '右上肺',
                'severity': '轻度',
                'measurements': {
                    'diameter': 8.2,
                    'unit': 'mm',
                    'volume': 288.7,
                    'volume_unit': 'mm³'
                },
                'coordinates': {
                    'x': 200,
                    'y': 150,
                    'z': 45
                },
                'significance': '可疑病变，需要随访观察',
                'differential_diagnosis': '良性结节、炎性假瘤、早期肺癌',
                'sort_order': 1,
                'is_key_finding': True,
                'created_by': 3
            },
            {
                'report_id': created_reports[1].id,
                'finding_category': '脑实质',
                'finding_description': '双侧大脑半球脑实质信号正常',
                'location': '双侧大脑半球',
                'severity': '正常',
                'significance': '正常表现',
                'sort_order': 1,
                'is_key_finding': False,
                'created_by': 3
            }
        ]
        
        for finding_data in findings_data:
            finding = ReportFinding(**finding_data)
            session.add(finding)
            print(f"   创建所见: {finding.finding_category} - {finding.location}")
        
        session.commit()
        
        print("📝 初始化修订历史数据...")
        
        # 创建修订历史数据
        revision_data = {
            'report_id': created_reports[0].id,
            'revision_number': 1,
            'revision_reason': '补充AI分析结果',
            'revision_description': '添加AI辅助诊断的置信度和建议信息',
            'previous_content': {
                'ai_assisted': False,
                'ai_suggestions': None,
                'ai_confidence': None
            },
            'current_content': {
                'ai_assisted': True,
                'ai_suggestions': {
                    'nodule_detection': {
                        'detected': True,
                        'location': '右上肺',
                        'size': '8.2mm',
                        'confidence': 0.89
                    }
                },
                'ai_confidence': 0.89
            },
            'changed_fields': ['ai_assisted', 'ai_suggestions', 'ai_confidence'],
            'revised_by': 3,
            'approved_by': 3,
            'approved_at': datetime.now()
        }
        
        revision = ReportRevision(**revision_data)
        session.add(revision)
        print(f"   创建修订: 版本{revision.revision_number} - {revision.revision_reason}")
        
        session.commit()
        
        print("=" * 60)
        print("🎉 诊断报告表初始化完成!")
        
        # 统计数据
        print("📊 数据统计:")
        template_count = session.query(ReportTemplate).count()
        report_count = session.query(DiagnosticReport).count()
        finding_count = session.query(ReportFinding).count()
        revision_count = session.query(ReportRevision).count()
        
        print(f"   报告模板: {template_count}")
        print(f"   诊断报告: {report_count}")
        print(f"   报告所见: {finding_count}")
        print(f"   修订历史: {revision_count}")
        
        print("\n📋 测试报告信息:")
        for report in created_reports:
            print(f"   {report.report_title} ({report.report_number}) - {report.status.value} - {report.reporting_physician}")
        
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
        print("\n✅ 诊断报告表初始化成功!")
        print("🎯 系统已准备好进行诊断报告管理功能开发!")
    else:
        print("\n❌ 诊断报告表初始化失败!")
        sys.exit(1)
