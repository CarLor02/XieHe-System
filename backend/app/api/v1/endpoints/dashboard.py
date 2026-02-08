"""
仪表板API端点 - 真实数据版本

提供基于真实数据库查询的仪表板统计信息

@author XieHe Medical System
@created 2025-09-28
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func, text
from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.core.logging import get_logger
from app.core.response import success_response
from app.models.patient import Patient, PatientStatusEnum
from app.models.image_file import ImageFile, ImageFileStatusEnum
from app.models.report import DiagnosticReport, ReportStatusEnum, PriorityEnum

logger = get_logger(__name__)
router = APIRouter()

# Pydantic模型定义
class DashboardOverview(BaseModel):
    """仪表板概览数据"""
    # 患者统计
    total_patients: int = Field(..., description="总患者数")
    new_patients_today: int = Field(..., description="今日新增患者")
    new_patients_week: int = Field(..., description="本周新增患者")
    active_patients: int = Field(..., description="活跃患者数")

    # 影像统计（原检查统计）
    total_images: int = Field(..., description="总影像数")
    images_today: int = Field(..., description="今日上传影像")
    images_week: int = Field(..., description="本周上传影像")
    pending_images: int = Field(..., description="待处理影像")
    processed_images: int = Field(..., description="已处理影像")

    # 系统统计
    completion_rate: float = Field(..., description="完成率")
    average_processing_time: float = Field(..., description="平均处理时间(小时)")
    system_alerts: int = Field(..., description="系统警告数")
    
    # 时间戳
    generated_at: datetime = Field(..., description="生成时间")

class RecentActivity(BaseModel):
    """最近活动"""
    id: int
    type: str  # patient, study, report
    title: str
    description: str
    timestamp: datetime
    status: str

class SystemMetric(BaseModel):
    """系统指标"""
    name: str
    value: float
    unit: str
    status: str  # normal, warning, critical
    trend: str  # up, down, stable

class DashboardStats(BaseModel):
    """仪表板统计数据"""
    overview: DashboardOverview
    recent_activities: List[RecentActivity]
    system_metrics: List[SystemMetric]

# API端点
@router.get("/overview", response_model=Dict[str, Any], summary="获取仪表板概览")
async def get_dashboard_overview(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取仪表板概览数据

    基于真实数据库查询生成统计信息

    权限控制：
    - 普通用户：只统计自己上传的影像
    - 团队负责人(ADMIN)：统计团队所有成员上传的影像
    - 超级管理员(is_superuser)：统计全部影像
    """
    try:
        from app.models.team import TeamMembership, TeamMembershipRole, TeamMembershipStatus

        # 时间范围定义
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        today_start = datetime.combine(today, datetime.min.time())
        week_start_dt = datetime.combine(week_start, datetime.min.time())

        # 获取用户权限信息
        user_id = current_user.get('id')
        is_superuser = current_user.get('is_superuser', False)

        # 构建影像文件的权限过滤条件
        image_permission_filter = None
        if not is_superuser:
            # 非超级管理员需要进行权限过滤
            # 1. 获取用户作为ADMIN的所有团队
            admin_teams = db.query(TeamMembership).filter(
                TeamMembership.user_id == user_id,
                TeamMembership.role == TeamMembershipRole.ADMIN,
                TeamMembership.status == TeamMembershipStatus.ACTIVE
            ).all()

            if admin_teams:
                # 用户是某些团队的负责人，可以看到这些团队所有成员上传的影像
                team_ids = [tm.team_id for tm in admin_teams]

                # 获取这些团队的所有成员ID
                team_member_ids = db.query(TeamMembership.user_id).filter(
                    TeamMembership.team_id.in_(team_ids),
                    TeamMembership.status == TeamMembershipStatus.ACTIVE
                ).distinct().all()
                team_member_ids = [mid[0] for mid in team_member_ids]

                # 可以看到：自己上传的 + 团队成员上传的
                image_permission_filter = or_(
                    ImageFile.uploaded_by == user_id,
                    ImageFile.uploaded_by.in_(team_member_ids)
                )
            else:
                # 普通用户，只能看到自己上传的影像
                image_permission_filter = ImageFile.uploaded_by == user_id

        # 患者统计（不受权限限制，显示全部患者）
        total_patients = db.query(func.count(Patient.id)).filter(Patient.is_deleted == False).scalar() or 0

        new_patients_today = db.query(func.count(Patient.id)).filter(
            and_(
                Patient.is_deleted == False,
                Patient.created_at >= today_start
            )
        ).scalar() or 0

        new_patients_week = db.query(func.count(Patient.id)).filter(
            and_(
                Patient.is_deleted == False,
                Patient.created_at >= week_start_dt
            )
        ).scalar() or 0

        active_patients = db.query(func.count(Patient.id)).filter(
            and_(
                Patient.is_deleted == False,
                Patient.status == PatientStatusEnum.ACTIVE
            )
        ).scalar() or 0

        # 影像文件统计（应用权限过滤）
        base_image_filter = ImageFile.is_deleted == False
        if image_permission_filter is not None:
            base_image_filter = and_(base_image_filter, image_permission_filter)

        total_studies = db.query(func.count(ImageFile.id)).filter(
            base_image_filter
        ).scalar() or 0

        studies_today = db.query(func.count(ImageFile.id)).filter(
            and_(
                ImageFile.created_at >= today_start,
                base_image_filter
            )
        ).scalar() or 0

        studies_week = db.query(func.count(ImageFile.id)).filter(
            and_(
                ImageFile.created_at >= week_start_dt,
                base_image_filter
            )
        ).scalar() or 0

        # 待处理影像 = 状态为 UPLOADED 或 PROCESSING 的影像文件
        pending_images = db.query(func.count(ImageFile.id)).filter(
            and_(
                base_image_filter,
                or_(
                    ImageFile.status == ImageFileStatusEnum.UPLOADED,
                    ImageFile.status == ImageFileStatusEnum.PROCESSING
                )
            )
        ).scalar() or 0

        # 已处理影像 = 状态为 PROCESSED 的影像文件
        processed_images = db.query(func.count(ImageFile.id)).filter(
            and_(
                base_image_filter,
                ImageFile.status == ImageFileStatusEnum.PROCESSED
            )
        ).scalar() or 0

        # 计算完成率
        completion_rate = 0.0
        if total_studies > 0:
            completion_rate = round((processed_images / total_studies) * 100, 1)

        # 计算平均处理时间（小时）
        # 简化实现，使用固定值
        avg_processing_time = 2.5  # 假设平均处理时间为2.5小时

        overview = DashboardOverview(
            total_patients=total_patients,
            new_patients_today=new_patients_today,
            new_patients_week=new_patients_week,
            active_patients=active_patients,
            total_images=total_studies,
            images_today=studies_today,
            images_week=studies_week,
            pending_images=pending_images,
            processed_images=processed_images,
            completion_rate=completion_rate,
            average_processing_time=avg_processing_time,
            system_alerts=pending_images,  # 待处理影像数作为系统警告
            generated_at=datetime.now()
        )

        return success_response(data=overview.model_dump(), message="获取仪表板概览成功")

    except Exception as e:
        logger.error(f"获取仪表板概览失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取仪表板概览过程中发生错误"
        )

@router.get("/recent-activities", response_model=Dict[str, Any], summary="获取最近活动")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50, description="返回数量限制"),
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取最近活动列表
    """
    try:
        activities = []

        # 获取最近的患者
        recent_patients = db.query(Patient).filter(
            Patient.is_deleted == False
        ).order_by(desc(Patient.created_at)).limit(limit // 3).all()

        for patient in recent_patients:
            activities.append(RecentActivity(
                id=patient.id,
                type="patient",
                title=f"新患者: {patient.name}",
                description=f"患者ID: {patient.patient_id}",
                timestamp=patient.created_at,
                status="new"
            ))

        # 获取最近的影像文件
        recent_files = db.query(ImageFile).filter(
            ImageFile.is_deleted == False
        ).order_by(desc(ImageFile.created_at)).limit(limit // 3).all()

        for file in recent_files:
            activities.append(RecentActivity(
                id=file.id,
                type="image",
                title=f"新影像: {file.original_filename or '影像文件'}",
                description=f"文件ID: {file.id}",
                timestamp=file.created_at,
                status=file.status.value if hasattr(file.status, 'value') else str(file.status)
            ))

        # 获取最近的报告
        recent_reports = db.query(DiagnosticReport).filter(
            DiagnosticReport.is_deleted == False
        ).order_by(desc(DiagnosticReport.created_at)).limit(limit // 3).all()

        for report in recent_reports:
            activities.append(RecentActivity(
                id=report.id,
                type="report",
                title=f"新报告: {report.report_title}",
                description=f"报告编号: {report.report_number}",
                timestamp=report.created_at,
                status=report.status.value if hasattr(report.status, 'value') else str(report.status)
            ))

        # 按时间排序并限制数量
        activities.sort(key=lambda x: x.timestamp, reverse=True)
        activities = activities[:limit]

        return success_response(
            data={"activities": [activity.model_dump() for activity in activities], "total": len(activities)},
            message="获取最近活动成功"
        )

    except Exception as e:
        logger.error(f"获取最近活动失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取最近活动过程中发生错误"
        )

@router.get("/system-metrics", response_model=Dict[str, Any], summary="获取系统指标")
async def get_system_metrics(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取系统性能指标
    """
    try:
        metrics = []

        # 数据库连接数（模拟）
        metrics.append(SystemMetric(
            name="数据库连接数",
            value=15.0,
            unit="个",
            status="normal",
            trend="stable"
        ))

        # 内存使用率（模拟）
        metrics.append(SystemMetric(
            name="内存使用率",
            value=68.5,
            unit="%",
            status="normal",
            trend="up"
        ))

        # CPU使用率（模拟）
        metrics.append(SystemMetric(
            name="CPU使用率",
            value=45.2,
            unit="%",
            status="normal",
            trend="stable"
        ))

        # 磁盘使用率（模拟）
        metrics.append(SystemMetric(
            name="磁盘使用率",
            value=72.8,
            unit="%",
            status="warning",
            trend="up"
        ))

        return success_response(
            data={"metrics": [metric.model_dump() for metric in metrics]},
            message="获取系统指标成功"
        )

    except Exception as e:
        logger.error(f"获取系统指标失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取系统指标过程中发生错误"
        )


@router.get("/stats", response_model=Dict[str, Any], summary="获取仪表板统计数据")
async def get_dashboard_stats(
    current_user: Dict[str, Any] = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    获取仪表板统计数据

    返回基本的统计信息，用于前端仪表板显示

    权限控制：
    - 普通用户：只统计自己上传的影像
    - 团队负责人(ADMIN)：统计团队所有成员上传的影像
    - 超级管理员(is_superuser)：统计全部影像
    """
    try:
        from app.models.team import TeamMembership, TeamMembershipRole, TeamMembershipStatus

        # 时间范围定义
        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        today_start = datetime.combine(today, datetime.min.time())
        week_start_dt = datetime.combine(week_start, datetime.min.time())

        # 获取用户权限信息
        user_id = current_user.get('id')
        is_superuser = current_user.get('is_superuser', False)

        # 构建影像文件的权限过滤条件
        image_permission_filter = None
        if not is_superuser:
            # 非超级管理员需要进行权限过滤
            # 1. 获取用户作为ADMIN的所有团队
            admin_teams = db.query(TeamMembership).filter(
                TeamMembership.user_id == user_id,
                TeamMembership.role == TeamMembershipRole.ADMIN,
                TeamMembership.status == TeamMembershipStatus.ACTIVE
            ).all()

            if admin_teams:
                # 用户是某些团队的负责人，可以看到这些团队所有成员上传的影像
                team_ids = [tm.team_id for tm in admin_teams]

                # 获取这些团队的所有成员ID
                team_member_ids = db.query(TeamMembership.user_id).filter(
                    TeamMembership.team_id.in_(team_ids),
                    TeamMembership.status == TeamMembershipStatus.ACTIVE
                ).distinct().all()
                team_member_ids = [mid[0] for mid in team_member_ids]

                # 可以看到：自己上传的 + 团队成员上传的
                image_permission_filter = or_(
                    ImageFile.uploaded_by == user_id,
                    ImageFile.uploaded_by.in_(team_member_ids)
                )
            else:
                # 普通用户，只能看到自己上传的影像
                image_permission_filter = ImageFile.uploaded_by == user_id

        # 患者统计（不受权限限制，显示全部患者）
        total_patients = db.query(func.count(Patient.id)).filter(Patient.is_deleted == False).scalar() or 0

        new_patients_today = db.query(func.count(Patient.id)).filter(
            and_(
                Patient.is_deleted == False,
                Patient.created_at >= today_start
            )
        ).scalar() or 0

        new_patients_week = db.query(func.count(Patient.id)).filter(
            and_(
                Patient.is_deleted == False,
                Patient.created_at >= week_start_dt
            )
        ).scalar() or 0

        active_patients = db.query(func.count(Patient.id)).filter(
            and_(
                Patient.is_deleted == False,
                Patient.status == PatientStatusEnum.ACTIVE
            )
        ).scalar() or 0

        # 影像统计（应用权限过滤）
        base_image_filter = ImageFile.is_deleted == False
        if image_permission_filter is not None:
            base_image_filter = and_(base_image_filter, image_permission_filter)

        total_studies = db.query(func.count(ImageFile.id)).filter(
            base_image_filter
        ).scalar() or 0

        studies_today = db.query(func.count(ImageFile.id)).filter(
            and_(
                ImageFile.created_at >= today_start,
                base_image_filter
            )
        ).scalar() or 0

        studies_week = db.query(func.count(ImageFile.id)).filter(
            and_(
                ImageFile.created_at >= week_start_dt,
                base_image_filter
            )
        ).scalar() or 0

        # 待处理影像 = 状态为 UPLOADED 或 PROCESSING 的影像文件
        pending_images = db.query(func.count(ImageFile.id)).filter(
            and_(
                base_image_filter,
                or_(
                    ImageFile.status == ImageFileStatusEnum.UPLOADED,
                    ImageFile.status == ImageFileStatusEnum.PROCESSING
                )
            )
        ).scalar() or 0

        # 已处理影像 = 状态为 PROCESSED 的影像文件
        processed_images = db.query(func.count(ImageFile.id)).filter(
            and_(
                base_image_filter,
                ImageFile.status == ImageFileStatusEnum.PROCESSED
            )
        ).scalar() or 0

        # 计算完成率
        completion_rate = 0.0
        if total_studies > 0:
            completion_rate = round((processed_images / total_studies) * 100, 1)

        # 计算平均处理时间（小时）
        # 简化实现，使用固定值
        avg_processing_time = 2.5  # 假设平均处理时间为2.5小时

        overview = DashboardOverview(
            total_patients=total_patients,
            new_patients_today=new_patients_today,
            new_patients_week=new_patients_week,
            active_patients=active_patients,
            total_images=total_studies,
            images_today=studies_today,
            images_week=studies_week,
            pending_images=pending_images,
            processed_images=processed_images,
            completion_rate=completion_rate,
            average_processing_time=avg_processing_time,
            system_alerts=pending_images,  # 待处理影像数作为系统警告
            generated_at=datetime.now()
        )

        return success_response(data=overview.model_dump(), message="获取仪表板统计数据成功")

    except Exception as e:
        logger.error(f"获取仪表板统计数据失败: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="获取仪表板统计数据过程中发生错误"
        )


@router.get("/tasks", response_model=Dict[str, Any])
async def get_dashboard_tasks(
    current_user: dict = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """获取仪表板任务列表"""
    try:
        # 模拟任务数据，实际应该从任务表获取
        tasks = [
            {
                "task_id": "TASK_001",
                "title": "审核胸部X光报告",
                "description": "需要审核患者张三的胸部X光检查报告",
                "status": "pending",
                "priority": "high",
                "assigned_to": "USER_001",
                "assigned_to_name": "李医生",
                "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
                "due_date": (datetime.now() + timedelta(days=1)).isoformat(),
                "progress": 0,
                "tags": ["紧急", "审核"],
                "estimated_hours": 2.0
            },
            {
                "task_id": "TASK_002",
                "title": "处理MRI影像数据",
                "description": "处理患者李四的头部MRI影像数据",
                "status": "in_progress",
                "priority": "normal",
                "assigned_to": "USER_002",
                "assigned_to_name": "王医生",
                "created_at": (datetime.now() - timedelta(hours=4)).isoformat(),
                "progress": 65,
                "tags": ["影像", "处理"],
                "estimated_hours": 3.0,
                "actual_hours": 2.0
            },
            {
                "task_id": "TASK_003",
                "title": "更新患者档案",
                "description": "更新患者王五的基本信息和病史记录",
                "status": "completed",
                "priority": "low",
                "assigned_to": "USER_003",
                "assigned_to_name": "赵医生",
                "created_at": (datetime.now() - timedelta(hours=6)).isoformat(),
                "progress": 100,
                "tags": ["档案", "更新"],
                "estimated_hours": 1.0,
                "actual_hours": 0.8
            }
        ]

        return success_response(data={"tasks": tasks}, message="获取任务列表成功")

    except Exception as e:
        logger.error(f"获取任务列表失败: {e}")
        raise HTTPException(status_code=500, detail="获取任务列表失败")
