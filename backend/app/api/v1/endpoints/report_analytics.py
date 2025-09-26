"""
报告统计分析API端点

提供报告数据统计、分析、图表数据等功能的API接口
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from enum import Enum
import random

router = APIRouter()

# 统计时间范围枚举
class TimeRange(str, Enum):
    TODAY = "today"
    WEEK = "week"
    MONTH = "month"
    QUARTER = "quarter"
    YEAR = "year"
    CUSTOM = "custom"

# 图表类型枚举
class ChartType(str, Enum):
    LINE = "line"
    BAR = "bar"
    PIE = "pie"
    AREA = "area"
    SCATTER = "scatter"

# 请求模型
class AnalyticsRequest(BaseModel):
    time_range: TimeRange = Field(..., description="时间范围")
    start_date: Optional[str] = Field(None, description="开始日期 YYYY-MM-DD")
    end_date: Optional[str] = Field(None, description="结束日期 YYYY-MM-DD")
    report_types: Optional[List[str]] = Field(None, description="报告类型筛选")
    departments: Optional[List[str]] = Field(None, description="科室筛选")
    doctors: Optional[List[str]] = Field(None, description="医生筛选")

# 响应模型
class ReportStatistics(BaseModel):
    total_reports: int
    completed_reports: int
    pending_reports: int
    rejected_reports: int
    completion_rate: float
    average_completion_time: float  # 小时
    reports_by_type: Dict[str, int]
    reports_by_department: Dict[str, int]
    reports_by_status: Dict[str, int]

class DoctorWorkload(BaseModel):
    doctor_id: str
    doctor_name: str
    department: str
    total_reports: int
    completed_reports: int
    pending_reports: int
    average_completion_time: float
    efficiency_score: float
    workload_trend: List[Dict[str, Any]]

class PatientAnalytics(BaseModel):
    total_patients: int
    new_patients: int
    returning_patients: int
    patients_by_age_group: Dict[str, int]
    patients_by_gender: Dict[str, int]
    patients_by_department: Dict[str, int]
    patient_visit_frequency: Dict[str, int]

class TimeSeriesData(BaseModel):
    date: str
    value: Union[int, float]
    label: Optional[str] = None

class ChartData(BaseModel):
    chart_type: ChartType
    title: str
    x_axis_label: str
    y_axis_label: str
    data: List[TimeSeriesData]
    colors: Optional[List[str]] = None

class AnalyticsDashboard(BaseModel):
    overview: ReportStatistics
    doctor_workload: List[DoctorWorkload]
    patient_analytics: PatientAnalytics
    charts: List[ChartData]
    generated_at: datetime

# API端点
@router.get("/overview", response_model=ReportStatistics)
async def get_report_overview(
    time_range: TimeRange = Query(TimeRange.MONTH, description="时间范围"),
    start_date: Optional[str] = Query(None, description="开始日期"),
    end_date: Optional[str] = Query(None, description="结束日期")
):
    """获取报告统计概览"""
    try:
        # 模拟统计数据
        mock_data = ReportStatistics(
            total_reports=1247,
            completed_reports=1089,
            pending_reports=98,
            rejected_reports=60,
            completion_rate=87.3,
            average_completion_time=2.4,
            reports_by_type={
                "X-RAY": 456,
                "CT": 298,
                "MRI": 234,
                "超声": 189,
                "其他": 70
            },
            reports_by_department={
                "放射科": 567,
                "心内科": 234,
                "骨科": 189,
                "神经科": 156,
                "其他": 101
            },
            reports_by_status={
                "已完成": 1089,
                "待审核": 98,
                "已拒绝": 60
            }
        )
        
        return mock_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取统计概览失败: {str(e)}")

@router.get("/doctor-workload", response_model=List[DoctorWorkload])
async def get_doctor_workload(
    time_range: TimeRange = Query(TimeRange.MONTH, description="时间范围"),
    department: Optional[str] = Query(None, description="科室筛选"),
    limit: int = Query(20, ge=1, le=100, description="返回数量限制")
):
    """获取医生工作量统计"""
    try:
        # 模拟医生工作量数据
        mock_doctors = []
        for i in range(1, min(limit + 1, 11)):
            # 生成趋势数据
            trend_data = []
            for j in range(7):  # 最近7天
                date = (datetime.now() - timedelta(days=6-j)).strftime("%Y-%m-%d")
                trend_data.append({
                    "date": date,
                    "reports": random.randint(5, 25),
                    "completion_time": round(random.uniform(1.5, 4.0), 1)
                })
            
            doctor = DoctorWorkload(
                doctor_id=f"DOC_{i:03d}",
                doctor_name=f"医生{i}",
                department=random.choice(["放射科", "心内科", "骨科", "神经科"]),
                total_reports=random.randint(80, 200),
                completed_reports=random.randint(70, 180),
                pending_reports=random.randint(5, 20),
                average_completion_time=round(random.uniform(1.8, 3.5), 1),
                efficiency_score=round(random.uniform(75, 95), 1),
                workload_trend=trend_data
            )
            mock_doctors.append(doctor)
        
        # 按效率分数排序
        mock_doctors.sort(key=lambda x: x.efficiency_score, reverse=True)
        
        return mock_doctors
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取医生工作量失败: {str(e)}")

@router.get("/patient-analytics", response_model=PatientAnalytics)
async def get_patient_analytics(
    time_range: TimeRange = Query(TimeRange.MONTH, description="时间范围")
):
    """获取患者分析数据"""
    try:
        mock_data = PatientAnalytics(
            total_patients=2456,
            new_patients=234,
            returning_patients=2222,
            patients_by_age_group={
                "0-18": 156,
                "19-35": 567,
                "36-50": 789,
                "51-65": 634,
                "65+": 310
            },
            patients_by_gender={
                "男": 1234,
                "女": 1222
            },
            patients_by_department={
                "放射科": 789,
                "心内科": 456,
                "骨科": 345,
                "神经科": 234,
                "其他": 632
            },
            patient_visit_frequency={
                "首次就诊": 234,
                "2-5次": 1456,
                "6-10次": 567,
                "10次以上": 199
            }
        )
        
        return mock_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取患者分析失败: {str(e)}")

@router.get("/time-series", response_model=List[ChartData])
async def get_time_series_data(
    time_range: TimeRange = Query(TimeRange.MONTH, description="时间范围"),
    metrics: List[str] = Query(["reports", "completion_rate"], description="指标类型")
):
    """获取时间序列数据"""
    try:
        charts = []
        
        # 报告数量趋势
        if "reports" in metrics:
            report_data = []
            for i in range(30):  # 最近30天
                date = (datetime.now() - timedelta(days=29-i)).strftime("%Y-%m-%d")
                report_data.append(TimeSeriesData(
                    date=date,
                    value=random.randint(30, 80),
                    label=f"{random.randint(30, 80)}份报告"
                ))
            
            charts.append(ChartData(
                chart_type=ChartType.LINE,
                title="报告数量趋势",
                x_axis_label="日期",
                y_axis_label="报告数量",
                data=report_data,
                colors=["#3B82F6"]
            ))
        
        # 完成率趋势
        if "completion_rate" in metrics:
            completion_data = []
            for i in range(30):
                date = (datetime.now() - timedelta(days=29-i)).strftime("%Y-%m-%d")
                completion_data.append(TimeSeriesData(
                    date=date,
                    value=round(random.uniform(80, 95), 1),
                    label=f"{round(random.uniform(80, 95), 1)}%"
                ))
            
            charts.append(ChartData(
                chart_type=ChartType.AREA,
                title="报告完成率趋势",
                x_axis_label="日期",
                y_axis_label="完成率 (%)",
                data=completion_data,
                colors=["#10B981"]
            ))
        
        # 审核时间趋势
        if "review_time" in metrics:
            review_data = []
            for i in range(30):
                date = (datetime.now() - timedelta(days=29-i)).strftime("%Y-%m-%d")
                review_data.append(TimeSeriesData(
                    date=date,
                    value=round(random.uniform(1.5, 4.0), 1),
                    label=f"{round(random.uniform(1.5, 4.0), 1)}小时"
                ))
            
            charts.append(ChartData(
                chart_type=ChartType.BAR,
                title="平均审核时间趋势",
                x_axis_label="日期",
                y_axis_label="审核时间 (小时)",
                data=review_data,
                colors=["#F59E0B"]
            ))
        
        return charts
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取时间序列数据失败: {str(e)}")

@router.get("/dashboard", response_model=AnalyticsDashboard)
async def get_analytics_dashboard(
    time_range: TimeRange = Query(TimeRange.MONTH, description="时间范围")
):
    """获取完整的分析仪表板数据"""
    try:
        # 获取各部分数据
        overview = await get_report_overview(time_range)
        doctor_workload = await get_doctor_workload(time_range, limit=10)
        patient_analytics = await get_patient_analytics(time_range)
        charts = await get_time_series_data(time_range, ["reports", "completion_rate", "review_time"])
        
        dashboard = AnalyticsDashboard(
            overview=overview,
            doctor_workload=doctor_workload,
            patient_analytics=patient_analytics,
            charts=charts,
            generated_at=datetime.now()
        )
        
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取仪表板数据失败: {str(e)}")

@router.get("/export", response_model=Dict[str, Any])
async def export_analytics_data(
    time_range: TimeRange = Query(TimeRange.MONTH, description="时间范围"),
    format: str = Query("excel", description="导出格式: excel, csv, pdf"),
    include_charts: bool = Query(True, description="是否包含图表")
):
    """导出统计分析数据"""
    try:
        # 模拟导出功能
        export_info = {
            "export_id": f"EXP_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "format": format,
            "time_range": time_range,
            "include_charts": include_charts,
            "file_size": f"{random.randint(500, 2000)}KB",
            "download_url": f"/api/v1/downloads/analytics_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{format}",
            "expires_at": (datetime.now() + timedelta(hours=24)).isoformat(),
            "created_at": datetime.now().isoformat()
        }
        
        return {
            "success": True,
            "message": f"统计数据已成功导出为{format.upper()}格式",
            "data": export_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"导出数据失败: {str(e)}")

@router.get("/performance", response_model=Dict[str, Any])
async def get_performance_metrics(
    time_range: TimeRange = Query(TimeRange.MONTH, description="时间范围")
):
    """获取系统性能指标"""
    try:
        performance_data = {
            "system_metrics": {
                "average_response_time": round(random.uniform(0.1, 0.5), 3),
                "api_success_rate": round(random.uniform(98, 99.9), 2),
                "database_query_time": round(random.uniform(0.05, 0.2), 3),
                "concurrent_users": random.randint(50, 200),
                "memory_usage": round(random.uniform(60, 85), 1),
                "cpu_usage": round(random.uniform(30, 70), 1)
            },
            "report_metrics": {
                "reports_per_hour": round(random.uniform(15, 45), 1),
                "peak_hour_reports": random.randint(60, 120),
                "average_report_size": f"{random.randint(500, 2000)}KB",
                "storage_usage": f"{random.randint(50, 200)}GB",
                "backup_success_rate": round(random.uniform(98, 100), 1)
            },
            "user_metrics": {
                "active_users": random.randint(80, 150),
                "login_success_rate": round(random.uniform(95, 99), 1),
                "session_duration": round(random.uniform(2, 6), 1),
                "feature_usage": {
                    "report_creation": random.randint(200, 500),
                    "report_review": random.randint(150, 400),
                    "report_export": random.randint(50, 150),
                    "signature_creation": random.randint(100, 300)
                }
            }
        }
        
        return {
            "success": True,
            "data": performance_data,
            "generated_at": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取性能指标失败: {str(e)}")
