"""
诊断报告API端点

提供报告生成、编辑、审核、导出等功能

@author XieHe Medical System
@created 2025-09-24
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.report import DiagnosticReport, ReportTemplate, ReportStatusEnum, ReportPriorityEnum, ReportTypeEnum
from app.core.report_generator import report_generator
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter()

# Pydantic模型
class ReportGenerateRequest(BaseModel):
    """报告生成请求"""
    template_id: int = Field(..., description="模板ID")
    patient_id: int = Field(..., description="患者ID")
    study_id: int = Field(..., description="检查ID")
    user_inputs: Optional[Dict[str, Any]] = Field(None, description="用户输入数据")
    ai_analysis_id: Optional[str] = Field(None, description="AI分析结果ID")

class ReportUpdateRequest(BaseModel):
    """报告更新请求"""
    report_title: Optional[str] = Field(None, description="报告标题")
    clinical_history: Optional[str] = Field(None, description="临床病史")
    examination_technique: Optional[str] = Field(None, description="检查技术")
    findings: Optional[str] = Field(None, description="检查所见")
    impression: Optional[str] = Field(None, description="诊断意见")
    recommendations: Optional[str] = Field(None, description="建议")
    structured_data: Optional[Dict[str, Any]] = Field(None, description="结构化数据")
    primary_diagnosis: Optional[str] = Field(None, description="主要诊断")
    secondary_diagnosis: Optional[str] = Field(None, description="次要诊断")
    priority: Optional[ReportPriorityEnum] = Field(None, description="优先级")
    urgency_flag: Optional[bool] = Field(None, description="紧急标志")
    critical_flag: Optional[bool] = Field(None, description="危急值标志")
    notes: Optional[str] = Field(None, description="备注")
    tags: Optional[List[str]] = Field(None, description="标签")

class ReportResponse(BaseModel):
    """报告响应"""
    id: int
    report_number: str
    study_id: int
    patient_id: int
    template_id: Optional[int]
    report_type: ReportTypeEnum
    report_title: str
    status: ReportStatusEnum
    priority: ReportPriorityEnum
    clinical_history: Optional[str]
    examination_technique: Optional[str]
    findings: str
    impression: str
    recommendations: Optional[str]
    structured_data: Optional[Dict[str, Any]]
    primary_diagnosis: Optional[str]
    secondary_diagnosis: Optional[str]
    examination_date: Optional[date]
    report_date: date
    reporting_physician: str
    ai_assisted: bool
    ai_suggestions: Optional[Dict[str, Any]]
    ai_confidence: Optional[float]
    urgency_flag: bool
    critical_flag: bool
    notes: Optional[str]
    tags: Optional[List[str]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ReportListResponse(BaseModel):
    """报告列表响应"""
    reports: List[ReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportGenerateRequest,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    基于模板生成报告
    """
    try:
        # 获取模板
        template = db.query(ReportTemplate).filter(
            and_(
                ReportTemplate.id == request.template_id,
                ReportTemplate.is_deleted == False,
                ReportTemplate.is_active == True
            )
        ).first()
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告模板不存在或已停用"
            )
        
        # 获取患者数据（模拟数据）
        patient_data = {
            "id": request.patient_id,
            "name": "张三",
            "age": 45,
            "gender": "男",
            "id_number": "110101197901010001"
        }
        
        # 获取检查数据（模拟数据）
        study_data = {
            "id": request.study_id,
            "study_date": date.today(),
            "modality": template.modality or "CT",
            "body_part": template.body_part or "胸部",
            "description": f"{template.body_part or ''}检查",
            "referring_physician": "李医生",
            "is_emergency": False
        }
        
        # 获取AI分析结果
        ai_results = None
        if request.ai_analysis_id:
            ai_results = {
                "predicted_class": "正常",
                "confidence": 0.95,
                "suggestions": ["建议定期复查"],
                "findings": [
                    {"description": "双肺纹理清晰，未见明显实质性病变"}
                ]
            }
        
        # 生成报告
        report_data = report_generator.generate_from_template(
            template=template,
            patient_data=patient_data,
            study_data=study_data,
            ai_results=ai_results,
            user_inputs=request.user_inputs
        )
        
        # 创建报告记录
        report = DiagnosticReport(**report_data)
        report.created_by = current_user.get("user_id")
        
        db.add(report)
        db.commit()
        db.refresh(report)
        
        # 后台任务：更新模板使用统计
        background_tasks.add_task(update_template_usage, template.id, db)
        
        logger.info(f"生成报告成功: {report.report_number}")
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"生成报告失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="生成报告失败"
        )

@router.get("/", response_model=ReportListResponse)
async def get_reports(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    patient_id: Optional[int] = Query(None, description="患者ID筛选"),
    status: Optional[ReportStatusEnum] = Query(None, description="状态筛选"),
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取报告列表
    """
    try:
        # 构建查询条件
        query = db.query(DiagnosticReport).filter(DiagnosticReport.is_deleted == False)
        
        # 筛选条件
        if patient_id:
            query = query.filter(DiagnosticReport.patient_id == patient_id)
        if status:
            query = query.filter(DiagnosticReport.status == status)
        
        # 排序
        query = query.order_by(desc(DiagnosticReport.created_at))
        
        # 分页
        total = query.count()
        offset = (page - 1) * page_size
        reports = query.offset(offset).limit(page_size).all()
        
        total_pages = (total + page_size - 1) // page_size
        
        logger.info(f"获取报告列表: {len(reports)} 个报告")
        
        return ReportListResponse(
            reports=reports,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"获取报告列表失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取报告列表失败"
        )

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    获取指定报告详情
    """
    try:
        report = db.query(DiagnosticReport).filter(
            and_(
                DiagnosticReport.id == report_id,
                DiagnosticReport.is_deleted == False
            )
        ).first()
        
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告不存在"
            )
        
        logger.info(f"获取报告详情: {report.report_number}")
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"获取报告详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取报告详情失败"
        )

@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    report_id: int,
    request: ReportUpdateRequest,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    更新报告内容
    """
    try:
        report = db.query(DiagnosticReport).filter(
            and_(
                DiagnosticReport.id == report_id,
                DiagnosticReport.is_deleted == False
            )
        ).first()

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告不存在"
            )

        # 更新报告字段
        update_data = request.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(report, field):
                setattr(report, field, value)

        report.updated_at = datetime.now()
        report.updated_by = current_user.get("user_id")

        db.commit()
        db.refresh(report)

        logger.info(f"更新报告成功: {report.report_number}")
        return report

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"更新报告失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="更新报告失败"
        )

@router.delete("/{report_id}")
async def delete_report(
    report_id: int,
    current_user = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    删除报告（软删除）
    """
    try:
        report = db.query(DiagnosticReport).filter(
            and_(
                DiagnosticReport.id == report_id,
                DiagnosticReport.is_deleted == False
            )
        ).first()

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="报告不存在"
            )

        report.is_deleted = True
        report.deleted_at = datetime.now()
        report.deleted_by = current_user.get("user_id")

        db.commit()

        logger.info(f"删除报告成功: {report.report_number}")
        return {"message": "报告删除成功"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"删除报告失败: {e}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="删除报告失败"
        )

# 后台任务函数
async def update_template_usage(template_id: int, db: Session):
    """更新模板使用统计"""
    try:
        template = db.query(ReportTemplate).filter(ReportTemplate.id == template_id).first()
        if template:
            template.usage_count = (template.usage_count or 0) + 1
            template.last_used_at = datetime.now()
            db.commit()
            logger.info(f"更新模板使用统计: {template.template_name}")
    except Exception as e:
        logger.error(f"更新模板使用统计失败: {e}")
        db.rollback()
