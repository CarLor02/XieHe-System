"""Schemas for the templates API endpoints."""

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from app.models.report import ReportTemplate, TemplateTypeEnum, ReportTypeEnum

class TemplateContentSection(BaseModel):
    """模板内容段落"""
    name: str = Field(..., description="段落名称")
    type: str = Field(..., description="段落类型: textarea, select, checklist, structured")
    required: bool = Field(False, description="是否必填")
    placeholder: Optional[str] = Field(None, description="占位符文本")
    options: Optional[List[str]] = Field(None, description="选项列表")
    fields: Optional[List[Dict[str, Any]]] = Field(None, description="子字段列表")


class TemplateContent(BaseModel):
    """模板内容"""
    sections: List[TemplateContentSection] = Field(..., description="模板段落列表")


class ReportTemplateCreate(BaseModel):
    """创建报告模板请求"""
    template_name: str = Field(..., min_length=1, max_length=100, description="模板名称")
    template_code: str = Field(..., min_length=1, max_length=50, description="模板编码")
    template_type: TemplateTypeEnum = Field(..., description="模板类型")
    report_type: ReportTypeEnum = Field(..., description="报告类型")
    modality: Optional[str] = Field(None, max_length=20, description="适用模态")
    body_part: Optional[str] = Field(None, max_length=50, description="适用部位")
    template_content: TemplateContent = Field(..., description="模板内容")
    default_values: Optional[Dict[str, Any]] = Field(None, description="默认值")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="验证规则")
    description: Optional[str] = Field(None, description="模板描述")
    is_active: bool = Field(True, description="是否启用")
    is_default: bool = Field(False, description="是否默认模板")


class ReportTemplateUpdate(BaseModel):
    """更新报告模板请求"""
    template_name: Optional[str] = Field(None, min_length=1, max_length=100, description="模板名称")
    template_type: Optional[TemplateTypeEnum] = Field(None, description="模板类型")
    report_type: Optional[ReportTypeEnum] = Field(None, description="报告类型")
    modality: Optional[str] = Field(None, max_length=20, description="适用模态")
    body_part: Optional[str] = Field(None, max_length=50, description="适用部位")
    template_content: Optional[TemplateContent] = Field(None, description="模板内容")
    default_values: Optional[Dict[str, Any]] = Field(None, description="默认值")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="验证规则")
    description: Optional[str] = Field(None, description="模板描述")
    is_active: Optional[bool] = Field(None, description="是否启用")
    is_default: Optional[bool] = Field(None, description="是否默认模板")


class ReportTemplateResponse(BaseModel):
    """报告模板响应"""
    id: int
    template_name: str
    template_code: str
    template_type: TemplateTypeEnum
    report_type: ReportTypeEnum
    modality: Optional[str]
    body_part: Optional[str]
    template_content: Dict[str, Any]
    default_values: Optional[Dict[str, Any]]
    validation_rules: Optional[Dict[str, Any]]
    is_active: bool
    is_default: bool
    version: str
    description: Optional[str]
    usage_count: int
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    updated_by: Optional[int]

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """模板列表响应"""
    templates: List[ReportTemplateResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class TemplateVersionCreate(BaseModel):
    """创建模板版本请求"""
    version_notes: str = Field(..., description="版本说明")
    template_content: TemplateContent = Field(..., description="模板内容")
    default_values: Optional[Dict[str, Any]] = Field(None, description="默认值")
    validation_rules: Optional[Dict[str, Any]] = Field(None, description="验证规则")
