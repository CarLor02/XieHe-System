"""
报告管理相关模型

包含诊断报告、报告模板、报告所见、修订历史等模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
"""

import enum
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, Boolean, Enum, ForeignKey, Float, JSON, func
from sqlalchemy.orm import relationship
from .base import Base


# 枚举定义
class ReportTypeEnum(str, enum.Enum):
    """报告类型枚举"""
    RADIOLOGY = "RADIOLOGY"
    PATHOLOGY = "PATHOLOGY"
    LABORATORY = "LABORATORY"
    ULTRASOUND = "ULTRASOUND"
    ENDOSCOPY = "ENDOSCOPY"
    ECG = "ECG"
    OTHER = "OTHER"


class ReportStatusEnum(str, enum.Enum):
    """报告状态枚举"""
    DRAFT = "DRAFT"
    IN_REVIEW = "IN_REVIEW"
    APPROVED = "APPROVED"
    FINALIZED = "FINALIZED"
    CANCELLED = "CANCELLED"
    ARCHIVED = "ARCHIVED"


class PriorityEnum(str, enum.Enum):
    """优先级枚举"""
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"
    STAT = "STAT"


class DiagnosisLevelEnum(str, enum.Enum):
    """诊断级别枚举"""
    NORMAL = "NORMAL"
    ABNORMAL = "ABNORMAL"
    SUSPICIOUS = "SUSPICIOUS"
    MALIGNANT = "MALIGNANT"
    BENIGN = "BENIGN"
    INDETERMINATE = "INDETERMINATE"


class TemplateTypeEnum(str, enum.Enum):
    """模板类型枚举"""
    STRUCTURED = "STRUCTURED"
    FREE_TEXT = "FREE_TEXT"
    HYBRID = "HYBRID"
    CHECKLIST = "CHECKLIST"


class DiagnosticReport(Base):
    """诊断报告表"""
    __tablename__ = "diagnostic_reports"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="报告ID")
    report_number = Column(String(50), unique=True, nullable=False, comment="报告编号")
    study_id = Column(Integer, nullable=False, comment="检查ID")
    patient_id = Column(Integer, nullable=False, comment="患者ID")
    template_id = Column(Integer, ForeignKey('report_templates.id'), comment="模板ID")
    report_type = Column(Enum(ReportTypeEnum), nullable=False, comment="报告类型")
    report_title = Column(String(200), nullable=False, comment="报告标题")
    status = Column(Enum(ReportStatusEnum), nullable=False, comment="报告状态")
    priority = Column(Enum(PriorityEnum), comment="优先级")
    clinical_history = Column(Text, comment="临床病史")
    examination_technique = Column(Text, comment="检查技术")
    findings = Column(Text, nullable=False, comment="检查所见")
    impression = Column(Text, nullable=False, comment="诊断意见")
    recommendations = Column(Text, comment="建议")
    structured_data = Column(JSON, comment="结构化数据")
    measurements = Column(JSON, comment="测量数据")
    annotations = Column(JSON, comment="标注数据")
    primary_diagnosis = Column(String(200), comment="主要诊断")
    secondary_diagnosis = Column(Text, comment="次要诊断")
    diagnosis_codes = Column(JSON, comment="诊断编码")
    diagnosis_level = Column(Enum(DiagnosisLevelEnum), comment="诊断级别")
    confidence_score = Column(Float, comment="置信度")
    examination_date = Column(Date, comment="检查日期")
    report_date = Column(Date, nullable=False, comment="报告日期")
    reviewed_date = Column(Date, comment="审核日期")
    finalized_date = Column(Date, comment="定稿日期")
    reporting_physician = Column(String(100), nullable=False, comment="报告医生")
    reviewing_physician = Column(String(100), comment="审核医生")
    attending_physician = Column(String(100), comment="主治医生")
    ai_assisted = Column(Boolean, default=False, comment="AI辅助")
    ai_suggestions = Column(JSON, comment="AI建议")
    ai_confidence = Column(Float, comment="AI置信度")
    quality_score = Column(Float, comment="质量评分")
    quality_notes = Column(Text, comment="质量备注")
    urgency_flag = Column(Boolean, default=False, comment="紧急标志")
    critical_flag = Column(Boolean, default=False, comment="危急值标志")
    follow_up_required = Column(Boolean, default=False, comment="需要随访")
    follow_up_date = Column(Date, comment="随访日期")
    notes = Column(Text, comment="备注")
    tags = Column(JSON, comment="标签")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
    
    # 关系
    template = relationship("ReportTemplate", back_populates="reports")
    findings_list = relationship("ReportFinding", back_populates="report")
    revisions = relationship("ReportRevision", back_populates="report")


class ReportTemplate(Base):
    """报告模板表"""
    __tablename__ = "report_templates"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="模板ID")
    template_name = Column(String(100), nullable=False, comment="模板名称")
    template_code = Column(String(50), unique=True, nullable=False, comment="模板代码")
    template_type = Column(Enum(TemplateTypeEnum), nullable=False, comment="模板类型")
    report_type = Column(Enum(ReportTypeEnum), nullable=False, comment="报告类型")
    modality = Column(String(20), comment="影像模态")
    body_part = Column(String(50), comment="身体部位")
    template_content = Column(JSON, nullable=False, comment="模板内容")
    default_values = Column(JSON, comment="默认值")
    validation_rules = Column(JSON, comment="验证规则")
    is_active = Column(Boolean, default=True, comment="是否激活")
    is_default = Column(Boolean, default=False, comment="是否默认")
    version = Column(String(20), comment="版本")
    description = Column(Text, comment="描述")
    usage_count = Column(Integer, default=0, comment="使用次数")
    last_used_at = Column(DateTime, comment="最后使用时间")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
    
    # 关系
    reports = relationship("DiagnosticReport", back_populates="template")


class ReportFinding(Base):
    """报告所见表"""
    __tablename__ = "report_findings"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="所见ID")
    report_id = Column(Integer, ForeignKey('diagnostic_reports.id'), nullable=False, comment="报告ID")
    finding_category = Column(String(100), nullable=False, comment="所见分类")
    finding_description = Column(Text, nullable=False, comment="所见描述")
    location = Column(String(100), comment="位置")
    severity = Column(String(50), comment="严重程度")
    measurements = Column(JSON, comment="测量数据")
    coordinates = Column(JSON, comment="坐标")
    significance = Column(String(100), comment="重要性")
    differential_diagnosis = Column(Text, comment="鉴别诊断")
    sort_order = Column(Integer, comment="排序")
    is_key_finding = Column(Boolean, default=False, comment="是否关键所见")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), comment="更新时间")
    created_by = Column(Integer, comment="创建人ID")
    updated_by = Column(Integer, comment="更新人ID")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
    
    # 关系
    report = relationship("DiagnosticReport", back_populates="findings_list")


class ReportRevision(Base):
    """报告修订历史表"""
    __tablename__ = "report_revisions"
    
    id = Column(Integer, primary_key=True, autoincrement=True, comment="修订ID")
    report_id = Column(Integer, ForeignKey('diagnostic_reports.id'), nullable=False, comment="报告ID")
    revision_number = Column(Integer, nullable=False, comment="修订版本号")
    revision_reason = Column(String(200), nullable=False, comment="修订原因")
    revision_description = Column(Text, comment="修订说明")
    previous_content = Column(JSON, nullable=False, comment="修订前内容")
    current_content = Column(JSON, nullable=False, comment="修订后内容")
    changed_fields = Column(JSON, comment="变更字段")
    revised_by = Column(Integer, nullable=False, comment="修订人ID")
    revised_at = Column(DateTime, default=func.now(), comment="修订时间")
    approved_by = Column(Integer, comment="批准人ID")
    approved_at = Column(DateTime, comment="批准时间")
    created_at = Column(DateTime, default=func.now(), comment="创建时间")
    is_deleted = Column(Boolean, default=False, comment="是否删除")
    deleted_at = Column(DateTime, comment="删除时间")
    deleted_by = Column(Integer, comment="删除人ID")
    
    # 关系
    report = relationship("DiagnosticReport", back_populates="revisions")

