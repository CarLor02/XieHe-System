"""
报告管理API端点 - 重构版本

实现报告的增删改查、生成、审核等核心功能

@author XieHe Medical System
@created 2025-09-28
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func
from pydantic import BaseModel, Field
import uuid

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.exceptions import BusinessLogicException, ResourceNotFoundException
from app.core.logging import get_logger
from app.models.report import DiagnosticReport, ReportTemplate, ReportStatusEnum, ReportPriorityEnum, ReportTypeEnum
from app.models.patient import Patient
from app.models.image import Study

logger = get_logger(__name__)
router = APIRouter()

# Pydantic模型定义
class ReportCreate(BaseModel):
    """创建报告模型"""
    patient_id: int = Field(..., description="患者ID")
    study_id: Optional[int] = Field(None, description="检查ID")
    template_id: Optional[int] = Field(None, description="模板ID")
    report_title: str = Field(..., description="报告标题", max_length=200)
    clinical_history: Optional[str] = Field(None, description="临床病史")
    examination_technique: Optional[str] = Field(None, description="检查技术")
    findings: Optional[str] = Field(None, description="检查所见")
    impression: Optional[str] = Field(None, description="诊断意见")
    recommendations: Optional[str] = Field(None, description="建议")
    primary_diagnosis: Optional[str] = Field(None, description="主要诊断")
    secondary_diagnosis: Optional[str] = Field(None, description="次要诊断")
    priority: Optional[str] = Field("normal", description="优先级")

class ReportUpdate(BaseModel):
    """更新报告模型"""
    report_title: Optional[str] = Field(None, description="报告标题", max_length=200)
    clinical_history: Optional[str] = Field(None, description="临床病史")
    examination_technique: Optional[str] = Field(None, description="检查技术")
    findings: Optional[str] = Field(None, description="检查所见")
    impression: Optional[str] = Field(None, description="诊断意见")
    recommendations: Optional[str] = Field(None, description="建议")
    primary_diagnosis: Optional[str] = Field(None, description="主要诊断")
    secondary_diagnosis: Optional[str] = Field(None, description="次要诊断")
    priority: Optional[str] = Field(None, description="优先级")

class ReportResponse(BaseModel):
    """报告响应模型"""
    id: int
    report_number: str
    patient_id: int
    patient_name: Optional[str]
    study_id: Optional[int]
    template_id: Optional[int]
    report_title: str
    clinical_history: Optional[str]
    examination_technique: Optional[str]
    findings: Optional[str]
    impression: Optional[str]
    recommendations: Optional[str]
    primary_diagnosis: Optional[str]
    secondary_diagnosis: Optional[str]
    priority: str
    status: str
    ai_assisted: bool
    ai_confidence: Optional[float]
    created_at: datetime
    updated_at: datetime
    created_by: Optional[int]
    reviewed_by: Optional[str]
    reviewed_at: Optional[date]

    class Config:
        from_attributes = True

class ReportListResponse(BaseModel):
    """报告列表响应模型"""
    reports: List[ReportResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

# 辅助函数
def convert_priority_to_enum(priority_str: str) -> ReportPriorityEnum:
    """转换优先级字符串为枚举"""
    priority_map = {
        "low": ReportPriorityEnum.LOW,
        "normal": ReportPriorityEnum.NORMAL,
        "high": ReportPriorityEnum.HIGH,
        "urgent": ReportPriorityEnum.URGENT,
        "stat": ReportPriorityEnum.STAT
    }
    return priority_map.get(priority_str.lower(), ReportPriorityEnum.NORMAL)

def convert_enum_to_priority(priority_enum: ReportPriorityEnum) -> str:
    """转换优先级枚举为字符串"""
    priority_map = {
        ReportPriorityEnum.LOW: "low",
        ReportPriorityEnum.NORMAL: "normal",
        ReportPriorityEnum.HIGH: "high",
        ReportPriorityEnum.URGENT: "urgent",
        ReportPriorityEnum.STAT: "stat"
    }
    return priority_map.get(priority_enum, "normal")

def generate_report_number() -> str:
    """生成报告编号"""
    today = datetime.now()
    return f"RPT{today.strftime('%Y%m%d')}{uuid.uuid4().hex[:8].upper()}"

# API端点
@router.post("/", response_model=ReportResponse, summary="创建报告")
async def create_report(
    report_data: ReportCreate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    创建新报告
    """
    try:
        # 验证患者是否存在
        patient = db.query(Patient).filter(
            and_(Patient.id == report_data.patient_id, Patient.is_deleted == False)
        ).first()
        
        if not patient:
            raise ResourceNotFoundException(f"患者 ID {report_data.patient_id} 不存在")

        # 验证检查是否存在（如果提供了study_id）
        if report_data.study_id:
            study = db.query(Study).filter(Study.id == report_data.study_id).first()
            if not study:
                raise ResourceNotFoundException(f"检查 ID {report_data.study_id} 不存在")

        # 创建新报告
        new_report = DiagnosticReport(
            report_number=generate_report_number(),
            patient_id=report_data.patient_id,
            study_id=report_data.study_id,
            template_id=report_data.template_id,
            report_title=report_data.report_title,
            clinical_history=report_data.clinical_history,
            examination_technique=report_data.examination_technique,
            findings=report_data.findings,
            impression=report_data.impression,
            recommendations=report_data.recommendations,
            primary_diagnosis=report_data.primary_diagnosis,
            secondary_diagnosis=report_data.secondary_diagnosis,
            priority=convert_priority_to_enum(report_data.priority),
            status=ReportStatusEnum.DRAFT,
            ai_assisted=False,
            created_by=current_user.get("id")
        )

        db.add(new_report)
        db.commit()
        db.refresh(new_report)

        logger.info(f"报告创建成功: {new_report.report_number} - {report_data.report_title}")

        # 转换为响应模型
        response_data = {
            "id": new_report.id,
            "report_number": new_report.report_number,
            "patient_id": new_report.patient_id,
            "patient_name": patient.name,
            "study_id": new_report.study_id,
            "template_id": new_report.template_id,
            "report_title": new_report.report_title,
            "clinical_history": new_report.clinical_history,
            "examination_technique": new_report.examination_technique,
            "findings": new_report.findings,
            "impression": new_report.impression,
            "recommendations": new_report.recommendations,
            "primary_diagnosis": new_report.primary_diagnosis,
            "secondary_diagnosis": new_report.secondary_diagnosis,
            "priority": convert_enum_to_priority(new_report.priority),
            "status": new_report.status.value,
            "ai_assisted": new_report.ai_assisted,
            "ai_confidence": float(new_report.ai_confidence) if new_report.ai_confidence else None,
            "created_at": new_report.created_at,
            "updated_at": new_report.updated_at,
            "created_by": new_report.created_by,
            "reviewed_by": new_report.reviewed_by,
            "reviewed_at": new_report.reviewed_at
        }

        return ReportResponse(**response_data)

    except (ResourceNotFoundException, BusinessLogicException):
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"报告创建失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="报告创建过程中发生错误"
        )

@router.get("/", summary="获取报告列表")
async def get_reports(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    patient_id: Optional[int] = Query(None, description="患者ID筛选"),
    status: Optional[str] = Query(None, description="状态筛选"),
    priority: Optional[str] = Query(None, description="优先级筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取报告列表（简化版本）

    支持分页、搜索和筛选功能
    """
    try:
        # 使用原生SQL查询避免ORM问题
        from sqlalchemy import text

        # 构建基础查询
        base_query = """
        SELECT
            dr.id,
            dr.report_number,
            dr.patient_id,
            p.name as patient_name,
            dr.study_id,
            dr.report_title,
            dr.status,
            dr.priority,
            dr.primary_diagnosis,
            dr.reporting_physician,
            dr.report_date,
            dr.created_at,
            dr.updated_at
        FROM diagnostic_reports dr
        LEFT JOIN patients p ON dr.patient_id = p.id
        WHERE (dr.is_deleted = 0 OR dr.is_deleted IS NULL)
        """

        # 添加筛选条件
        conditions = []
        params = {}

        if patient_id:
            conditions.append("dr.patient_id = :patient_id")
            params["patient_id"] = patient_id

        if status:
            conditions.append("dr.status = :status")
            params["status"] = status.upper()

        if priority:
            conditions.append("dr.priority = :priority")
            params["priority"] = priority.upper()

        if search:
            conditions.append("(p.name LIKE :search OR dr.report_title LIKE :search OR dr.primary_diagnosis LIKE :search)")
            params["search"] = f"%{search}%"

        if conditions:
            base_query += " AND " + " AND ".join(conditions)

        # 获取总数
        count_query = f"SELECT COUNT(*) FROM ({base_query}) as count_table"
        total = db.execute(text(count_query), params).scalar() or 0

        # 添加排序和分页
        base_query += " ORDER BY dr.created_at DESC LIMIT :limit OFFSET :offset"
        params["limit"] = page_size
        params["offset"] = (page - 1) * page_size

        # 执行查询
        result = db.execute(text(base_query), params)
        rows = result.fetchall()

        # 转换为响应格式
        reports = []
        for row in rows:
            report_data = {
                "id": row[0],
                "report_number": row[1] or f"RPT-{row[0]}",
                "patient_id": row[2],
                "patient_name": row[3] or "未知患者",
                "study_id": row[4],
                "report_title": row[5] or "诊断报告",
                "status": row[6] or "draft",
                "priority": row[7] or "normal",
                "primary_diagnosis": row[8] or "",
                "reporting_physician": row[9] or "未指定医生",
                "report_date": row[10].strftime('%Y-%m-%d') if row[10] else "",
                "created_at": row[11].isoformat() if row[11] else "",
                "updated_at": row[12].isoformat() if row[12] else ""
            }
            reports.append(report_data)

        return {
            "reports": reports,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": (total + page_size - 1) // page_size
        }

    except Exception as e:
        logger.error(f"获取报告列表失败: {e}")
        return {
            "reports": [],
            "total": 0,
            "page": page,
            "page_size": page_size,
            "total_pages": 0
        }

@router.get("/{report_id}", response_model=ReportResponse, summary="获取报告详情")
async def get_report(
    report_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取指定报告的详细信息
    """
    try:
        # 查询报告信息，关联患者表
        result = db.query(DiagnosticReport, Patient.name.label('patient_name')).join(
            Patient, DiagnosticReport.patient_id == Patient.id
        ).filter(
            and_(DiagnosticReport.id == report_id, or_(Patient.is_deleted == False, Patient.is_deleted.is_(None)))
        ).first()

        if not result:
            raise ResourceNotFoundException(f"报告 ID {report_id} 不存在")

        report, patient_name = result

        # 转换为响应格式
        response_data = {
            "id": report.id,
            "report_number": report.report_number,
            "patient_id": report.patient_id,
            "patient_name": patient_name,
            "study_id": report.study_id,
            "template_id": report.template_id,
            "report_title": report.report_title,
            "clinical_history": report.clinical_history,
            "examination_technique": report.examination_technique,
            "findings": report.findings,
            "impression": report.impression,
            "recommendations": report.recommendations,
            "primary_diagnosis": report.primary_diagnosis,
            "secondary_diagnosis": report.secondary_diagnosis,
            "priority": convert_enum_to_priority(report.priority),
            "status": report.status.value,
            "ai_assisted": report.ai_assisted,
            "ai_confidence": float(report.ai_confidence) if report.ai_confidence else None,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "created_by": report.created_by,
            "reviewed_by": report.reviewing_physician,
            "reviewed_at": report.reviewed_date
        }

        return ReportResponse(**response_data)

    except ResourceNotFoundException:
        raise
    except Exception as e:
        logger.error(f"获取报告详情失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取报告详情过程中发生错误"
        )

@router.put("/{report_id}", response_model=ReportResponse, summary="更新报告")
async def update_report(
    report_id: int,
    report_data: ReportUpdate,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    更新报告信息
    """
    try:
        # 查询报告信息，关联患者表
        result = db.query(DiagnosticReport, Patient.name.label('patient_name')).join(
            Patient, DiagnosticReport.patient_id == Patient.id
        ).filter(
            and_(DiagnosticReport.id == report_id, Patient.is_deleted == False)
        ).first()

        if not result:
            raise ResourceNotFoundException(f"报告 ID {report_id} 不存在")

        report, patient_name = result

        # 检查报告状态是否允许修改
        if report.status in [ReportStatusEnum.FINALIZED, ReportStatusEnum.ARCHIVED]:
            raise BusinessLogicException("已完成或已归档的报告不允许修改")

        # 更新报告信息
        update_data = report_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if field == "priority" and value:
                setattr(report, field, convert_priority_to_enum(value))
            else:
                setattr(report, field, value)

        report.updated_by = current_user.get("id")
        report.updated_at = datetime.now()

        db.commit()
        db.refresh(report)

        logger.info(f"报告更新成功: {report.report_number} - {report.report_title}")

        # 转换为响应格式
        response_data = {
            "id": report.id,
            "report_number": report.report_number,
            "patient_id": report.patient_id,
            "patient_name": patient_name,
            "study_id": report.study_id,
            "template_id": report.template_id,
            "report_title": report.report_title,
            "clinical_history": report.clinical_history,
            "examination_technique": report.examination_technique,
            "findings": report.findings,
            "impression": report.impression,
            "recommendations": report.recommendations,
            "primary_diagnosis": report.primary_diagnosis,
            "secondary_diagnosis": report.secondary_diagnosis,
            "priority": convert_enum_to_priority(report.priority),
            "status": report.status.value,
            "ai_assisted": report.ai_assisted,
            "ai_confidence": float(report.ai_confidence) if report.ai_confidence else None,
            "created_at": report.created_at,
            "updated_at": report.updated_at,
            "created_by": report.created_by,
            "reviewed_by": report.reviewed_by,
            "reviewed_at": report.reviewed_at
        }

        return ReportResponse(**response_data)

    except (ResourceNotFoundException, BusinessLogicException):
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"报告更新失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="报告更新过程中发生错误"
        )

@router.delete("/{report_id}", summary="删除报告")
async def delete_report(
    report_id: int,
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    删除报告（软删除）
    """
    try:
        report = db.query(DiagnosticReport).filter(DiagnosticReport.id == report_id).first()

        if not report:
            raise ResourceNotFoundException(f"报告 ID {report_id} 不存在")

        # 检查报告状态是否允许删除
        if report.status == ReportStatusEnum.FINALIZED:
            raise BusinessLogicException("已完成的报告不允许删除")

        # 软删除
        report.is_deleted = True
        report.updated_by = current_user.get("id")
        report.updated_at = datetime.now()

        db.commit()

        logger.info(f"报告删除成功: {report.report_number}")

        return {"message": "报告删除成功"}

    except (ResourceNotFoundException, BusinessLogicException):
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"报告删除失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="报告删除过程中发生错误"
        )
