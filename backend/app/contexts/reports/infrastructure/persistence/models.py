"""
报告管理相关模型

包含诊断报告、报告模板、报告所见、修订历史等模型定义

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
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, relationship

from app.shared.database.sqlalchemy import Base


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

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="报告ID"
    )
    report_number: Mapped[typing.Any] = Column(
        String(50), unique=True, nullable=False, comment="报告编号"
    )
    study_id: Mapped[int] = Column(Integer, nullable=False, comment="检查ID")
    patient_id: Mapped[int] = Column(Integer, nullable=False, comment="患者ID")
    template_id: Mapped[int | None] = Column(
        Integer, ForeignKey("report_templates.id"), comment="模板ID"
    )
    report_type: Mapped[ReportTypeEnum] = Column(
        Enum(ReportTypeEnum), nullable=False, comment="报告类型"
    )
    report_title: Mapped[typing.Any] = Column(
        String(200), nullable=False, comment="报告标题"
    )
    status: Mapped[ReportStatusEnum] = Column(
        Enum(ReportStatusEnum), nullable=False, comment="报告状态"
    )
    priority: Mapped[PriorityEnum | None] = Column(Enum(PriorityEnum), comment="优先级")
    clinical_history: Mapped[str | None] = Column(Text, comment="临床病史")
    examination_technique: Mapped[str | None] = Column(Text, comment="检查技术")
    findings: Mapped[str] = Column(Text, nullable=False, comment="检查所见")
    impression: Mapped[str] = Column(Text, nullable=False, comment="诊断意见")
    recommendations: Mapped[str | None] = Column(Text, comment="建议")
    structured_data: Mapped[typing.Any] = Column(JSON, comment="结构化数据")
    measurements: Mapped[typing.Any] = Column(JSON, comment="测量数据")
    annotations: Mapped[typing.Any] = Column(JSON, comment="标注数据")
    primary_diagnosis: Mapped[typing.Any] = Column(String(200), comment="主要诊断")
    secondary_diagnosis: Mapped[str | None] = Column(Text, comment="次要诊断")
    diagnosis_codes: Mapped[typing.Any] = Column(JSON, comment="诊断编码")
    diagnosis_level: Mapped[DiagnosisLevelEnum | None] = Column(
        Enum(DiagnosisLevelEnum), comment="诊断级别"
    )
    confidence_score: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="置信度"
    )
    examination_date: Mapped[datetime_types.date | None] = Column(
        Date, comment="检查日期"
    )
    report_date: Mapped[datetime_types.date] = Column(
        Date, nullable=False, comment="报告日期"
    )
    reviewed_date: Mapped[datetime_types.date | None] = Column(Date, comment="审核日期")
    finalized_date: Mapped[datetime_types.date | None] = Column(
        Date, comment="定稿日期"
    )
    reporting_physician: Mapped[typing.Any] = Column(
        String(100), nullable=False, comment="报告医生"
    )
    reviewing_physician: Mapped[typing.Any] = Column(String(100), comment="审核医生")
    attending_physician: Mapped[typing.Any] = Column(String(100), comment="主治医生")
    ai_assisted: Mapped[bool | None] = Column(Boolean, default=False, comment="AI辅助")
    ai_suggestions: Mapped[typing.Any] = Column(JSON, comment="AI建议")
    ai_confidence: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="AI置信度"
    )
    quality_score: Mapped[float | None] = Column(  # type: ignore[misc]
        Float, comment="质量评分"
    )
    quality_notes: Mapped[str | None] = Column(Text, comment="质量备注")
    urgency_flag: Mapped[bool | None] = Column(
        Boolean, default=False, comment="紧急标志"
    )
    critical_flag: Mapped[bool | None] = Column(
        Boolean, default=False, comment="危急值标志"
    )
    follow_up_required: Mapped[bool | None] = Column(
        Boolean, default=False, comment="需要随访"
    )
    follow_up_date: Mapped[datetime_types.date | None] = Column(
        Date, comment="随访日期"
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
    template: Mapped[ReportTemplate | None] = relationship(
        "ReportTemplate", back_populates="reports"
    )
    findings_list: Mapped[list[ReportFinding]] = relationship(
        "ReportFinding", back_populates="report"
    )
    revisions: Mapped[list[ReportRevision]] = relationship(
        "ReportRevision", back_populates="report"
    )


class ReportTemplate(Base):
    """报告模板表"""

    __tablename__ = "report_templates"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="模板ID"
    )
    template_name: Mapped[typing.Any] = Column(
        String(100), nullable=False, comment="模板名称"
    )
    template_code: Mapped[typing.Any] = Column(
        String(50), unique=True, nullable=False, comment="模板代码"
    )
    template_type: Mapped[TemplateTypeEnum] = Column(
        Enum(TemplateTypeEnum), nullable=False, comment="模板类型"
    )
    report_type: Mapped[ReportTypeEnum] = Column(
        Enum(ReportTypeEnum), nullable=False, comment="报告类型"
    )
    modality: Mapped[typing.Any] = Column(String(20), comment="影像模态")
    body_part: Mapped[typing.Any] = Column(String(50), comment="身体部位")
    template_content: Mapped[typing.Any] = Column(
        JSON, nullable=False, comment="模板内容"
    )
    default_values: Mapped[typing.Any] = Column(JSON, comment="默认值")
    validation_rules: Mapped[typing.Any] = Column(JSON, comment="验证规则")
    is_active: Mapped[bool | None] = Column(Boolean, default=True, comment="是否激活")
    is_default: Mapped[bool | None] = Column(Boolean, default=False, comment="是否默认")
    version: Mapped[typing.Any] = Column(String(20), comment="版本")
    description: Mapped[str | None] = Column(Text, comment="描述")
    usage_count: Mapped[int | None] = Column(Integer, default=0, comment="使用次数")
    last_used_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="最后使用时间"
    )
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
    reports: Mapped[list[DiagnosticReport]] = relationship(
        "DiagnosticReport", back_populates="template"
    )


class ReportFinding(Base):
    """报告所见表"""

    __tablename__ = "report_findings"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="所见ID"
    )
    report_id: Mapped[int] = Column(
        Integer, ForeignKey("diagnostic_reports.id"), nullable=False, comment="报告ID"
    )
    finding_category: Mapped[typing.Any] = Column(
        String(100), nullable=False, comment="所见分类"
    )
    finding_description: Mapped[str] = Column(Text, nullable=False, comment="所见描述")
    location: Mapped[typing.Any] = Column(String(100), comment="位置")
    severity: Mapped[typing.Any] = Column(String(50), comment="严重程度")
    measurements: Mapped[typing.Any] = Column(JSON, comment="测量数据")
    coordinates: Mapped[typing.Any] = Column(JSON, comment="坐标")
    significance: Mapped[typing.Any] = Column(String(100), comment="重要性")
    differential_diagnosis: Mapped[str | None] = Column(Text, comment="鉴别诊断")
    sort_order: Mapped[int | None] = Column(Integer, comment="排序")
    is_key_finding: Mapped[bool | None] = Column(
        Boolean, default=False, comment="是否关键所见"
    )
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
    report: Mapped[DiagnosticReport] = relationship(
        "DiagnosticReport", back_populates="findings_list"
    )


class ReportRevision(Base):
    """报告修订历史表"""

    __tablename__ = "report_revisions"

    id: Mapped[int] = Column(
        Integer, primary_key=True, autoincrement=True, comment="修订ID"
    )
    report_id: Mapped[int] = Column(
        Integer, ForeignKey("diagnostic_reports.id"), nullable=False, comment="报告ID"
    )
    revision_number: Mapped[int] = Column(Integer, nullable=False, comment="修订版本号")
    revision_reason: Mapped[typing.Any] = Column(
        String(200), nullable=False, comment="修订原因"
    )
    revision_description: Mapped[str | None] = Column(Text, comment="修订说明")
    previous_content: Mapped[typing.Any] = Column(
        JSON, nullable=False, comment="修订前内容"
    )
    current_content: Mapped[typing.Any] = Column(
        JSON, nullable=False, comment="修订后内容"
    )
    changed_fields: Mapped[typing.Any] = Column(JSON, comment="变更字段")
    revised_by: Mapped[int] = Column(Integer, nullable=False, comment="修订人ID")
    revised_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="修订时间"
    )
    approved_by: Mapped[int | None] = Column(Integer, comment="批准人ID")
    approved_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="批准时间"
    )
    created_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, default=func.now(), comment="创建时间"
    )
    is_deleted: Mapped[bool | None] = Column(Boolean, default=False, comment="是否删除")
    deleted_at: Mapped[datetime_types.datetime | None] = Column(
        DateTime, comment="删除时间"
    )
    deleted_by: Mapped[int | None] = Column(Integer, comment="删除人ID")

    # 关系
    report: Mapped[DiagnosticReport] = relationship(
        "DiagnosticReport", back_populates="revisions"
    )
