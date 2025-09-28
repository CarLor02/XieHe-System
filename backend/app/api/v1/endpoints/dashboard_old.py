"""
工作台仪表板API端点

提供综合性工作台仪表板数据和功能的API接口
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel, Field
from enum import Enum
import random

router = APIRouter()

# 任务状态枚举
class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"

# 任务优先级枚举
class TaskPriority(str, Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"

# 通知类型枚举
class NotificationType(str, Enum):
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    SUCCESS = "success"

# 系统状态枚举
class SystemStatus(str, Enum):
    HEALTHY = "healthy"
    WARNING = "warning"
    ERROR = "error"
    MAINTENANCE = "maintenance"

# 请求模型
class TaskCreateRequest(BaseModel):
    title: str = Field(..., description="任务标题")
    description: Optional[str] = Field(None, description="任务描述")
    priority: TaskPriority = Field(TaskPriority.NORMAL, description="任务优先级")
    due_date: Optional[str] = Field(None, description="截止日期")
    assigned_to: Optional[str] = Field(None, description="分配给")
    tags: Optional[List[str]] = Field(None, description="标签")

class NotificationCreateRequest(BaseModel):
    title: str = Field(..., description="通知标题")
    message: str = Field(..., description="通知内容")
    type: NotificationType = Field(NotificationType.INFO, description="通知类型")
    target_users: Optional[List[str]] = Field(None, description="目标用户")
    expires_at: Optional[str] = Field(None, description="过期时间")

# 响应模型
class DashboardOverview(BaseModel):
    total_reports: int
    pending_reports: int
    completed_reports: int
    overdue_reports: int
    total_patients: int
    new_patients_today: int
    active_users: int
    system_alerts: int
    completion_rate: float
    average_processing_time: float

class TaskItem(BaseModel):
    task_id: str
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    created_at: datetime
    due_date: Optional[datetime]
    assigned_to: Optional[str]
    assigned_to_name: Optional[str]
    progress: int  # 0-100
    tags: List[str]
    estimated_hours: Optional[float]
    actual_hours: Optional[float]

class NotificationItem(BaseModel):
    notification_id: str
    title: str
    message: str
    type: NotificationType
    created_at: datetime
    read: bool
    sender: Optional[str]
    sender_name: Optional[str]
    action_url: Optional[str]
    expires_at: Optional[datetime]

class SystemMetrics(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, float]
    database_connections: int
    active_sessions: int
    api_response_time: float
    error_rate: float
    uptime: str

class QuickAction(BaseModel):
    action_id: str
    title: str
    description: str
    icon: str
    url: str
    category: str
    permissions: List[str]
    usage_count: int

class WorkflowStatus(BaseModel):
    workflow_id: str
    name: str
    status: str
    total_steps: int
    completed_steps: int
    current_step: str
    started_at: datetime
    estimated_completion: Optional[datetime]
    assigned_users: List[str]

class DashboardData(BaseModel):
    overview: DashboardOverview
    recent_tasks: List[TaskItem]
    notifications: List[NotificationItem]
    system_metrics: SystemMetrics
    quick_actions: List[QuickAction]
    active_workflows: List[WorkflowStatus]
    generated_at: datetime

# API端点
@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview():
    """获取仪表板概览数据"""
    try:
        # 模拟概览数据
        overview = DashboardOverview(
            total_reports=1247,
            pending_reports=98,
            completed_reports=1089,
            overdue_reports=15,
            total_patients=2456,
            new_patients_today=23,
            active_users=45,
            system_alerts=3,
            completion_rate=87.3,
            average_processing_time=2.4
        )
        
        return overview
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取概览数据失败: {str(e)}")

@router.get("/tasks", response_model=List[TaskItem])
async def get_dashboard_tasks(
    status: Optional[TaskStatus] = Query(None, description="任务状态筛选"),
    priority: Optional[TaskPriority] = Query(None, description="优先级筛选"),
    assigned_to: Optional[str] = Query(None, description="分配人筛选"),
    limit: int = Query(10, ge=1, le=50, description="返回数量限制")
):
    """获取仪表板任务列表"""
    try:
        # 模拟任务数据
        mock_tasks = []
        for i in range(1, min(limit + 1, 16)):
            task = TaskItem(
                task_id=f"TASK_{i:03d}",
                title=f"任务{i}: " + random.choice([
                    "审核胸部X光报告", "处理MRI影像数据", "更新患者档案",
                    "系统维护检查", "数据备份任务", "报告模板更新"
                ]),
                description=f"这是任务{i}的详细描述",
                status=random.choice(list(TaskStatus)),
                priority=random.choice(list(TaskPriority)),
                created_at=datetime.now() - timedelta(days=random.randint(0, 7)),
                due_date=datetime.now() + timedelta(days=random.randint(1, 14)) if random.choice([True, False]) else None,
                assigned_to=f"USER_{random.randint(1, 10):03d}",
                assigned_to_name=random.choice(["张医生", "李医生", "王医生", "赵医生", "陈医生"]),
                progress=random.randint(0, 100),
                tags=random.sample(["紧急", "重要", "例行", "维护", "审核"], random.randint(1, 3)),
                estimated_hours=round(random.uniform(1, 8), 1),
                actual_hours=round(random.uniform(0.5, 6), 1) if random.choice([True, False]) else None
            )
            mock_tasks.append(task)
        
        # 应用筛选
        if status:
            mock_tasks = [t for t in mock_tasks if t.status == status]
        if priority:
            mock_tasks = [t for t in mock_tasks if t.priority == priority]
        if assigned_to:
            mock_tasks = [t for t in mock_tasks if t.assigned_to == assigned_to]
        
        # 按优先级和创建时间排序
        priority_order = {TaskPriority.URGENT: 4, TaskPriority.HIGH: 3, TaskPriority.NORMAL: 2, TaskPriority.LOW: 1}
        mock_tasks.sort(key=lambda x: (priority_order.get(x.priority, 0), x.created_at), reverse=True)
        
        return mock_tasks[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取任务列表失败: {str(e)}")

@router.post("/tasks", response_model=Dict[str, Any])
async def create_dashboard_task(task_request: TaskCreateRequest):
    """创建新任务"""
    try:
        # 模拟创建任务
        task_id = f"TASK_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        new_task = TaskItem(
            task_id=task_id,
            title=task_request.title,
            description=task_request.description,
            status=TaskStatus.PENDING,
            priority=task_request.priority,
            created_at=datetime.now(),
            due_date=datetime.fromisoformat(task_request.due_date) if task_request.due_date else None,
            assigned_to=task_request.assigned_to,
            assigned_to_name="待分配" if not task_request.assigned_to else "用户名",
            progress=0,
            tags=task_request.tags or [],
            estimated_hours=None,
            actual_hours=None
        )
        
        return {
            "success": True,
            "message": "任务创建成功",
            "data": new_task.dict()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"创建任务失败: {str(e)}")

@router.get("/notifications", response_model=List[NotificationItem])
async def get_dashboard_notifications(
    unread_only: bool = Query(False, description="仅显示未读通知"),
    type: Optional[NotificationType] = Query(None, description="通知类型筛选"),
    limit: int = Query(20, ge=1, le=100, description="返回数量限制")
):
    """获取仪表板通知列表"""
    try:
        # 模拟通知数据
        mock_notifications = []
        for i in range(1, min(limit + 1, 21)):
            notification = NotificationItem(
                notification_id=f"NOTIF_{i:03d}",
                title=random.choice([
                    "新报告待审核", "系统维护通知", "患者信息更新",
                    "审核任务完成", "系统警告", "数据备份完成"
                ]),
                message=f"这是通知{i}的详细内容，包含相关的操作信息和状态更新。",
                type=random.choice(list(NotificationType)),
                created_at=datetime.now() - timedelta(hours=random.randint(0, 48)),
                read=random.choice([True, False]),
                sender=f"SYSTEM" if random.choice([True, False]) else f"USER_{random.randint(1, 10):03d}",
                sender_name="系统" if random.choice([True, False]) else random.choice(["张医生", "李医生", "管理员"]),
                action_url=f"/action/{i}" if random.choice([True, False]) else None,
                expires_at=datetime.now() + timedelta(days=random.randint(1, 30)) if random.choice([True, False]) else None
            )
            mock_notifications.append(notification)
        
        # 应用筛选
        if unread_only:
            mock_notifications = [n for n in mock_notifications if not n.read]
        if type:
            mock_notifications = [n for n in mock_notifications if n.type == type]
        
        # 按创建时间排序
        mock_notifications.sort(key=lambda x: x.created_at, reverse=True)
        
        return mock_notifications[:limit]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取通知列表失败: {str(e)}")

@router.get("/system-metrics", response_model=SystemMetrics)
async def get_system_metrics():
    """获取系统性能指标"""
    try:
        metrics = SystemMetrics(
            cpu_usage=round(random.uniform(20, 80), 1),
            memory_usage=round(random.uniform(40, 85), 1),
            disk_usage=round(random.uniform(30, 70), 1),
            network_io={
                "incoming": round(random.uniform(10, 100), 2),
                "outgoing": round(random.uniform(5, 50), 2)
            },
            database_connections=random.randint(10, 50),
            active_sessions=random.randint(20, 100),
            api_response_time=round(random.uniform(0.1, 0.5), 3),
            error_rate=round(random.uniform(0.1, 2.0), 2),
            uptime=f"{random.randint(1, 30)}天{random.randint(0, 23)}小时{random.randint(0, 59)}分钟"
        )
        
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取系统指标失败: {str(e)}")

@router.get("/quick-actions", response_model=List[QuickAction])
async def get_quick_actions(
    category: Optional[str] = Query(None, description="分类筛选"),
    user_id: Optional[str] = Query(None, description="用户ID")
):
    """获取快捷操作列表"""
    try:
        mock_actions = [
            QuickAction(
                action_id="ACT_001",
                title="创建新报告",
                description="快速创建新的医疗报告",
                icon="ri-file-add-line",
                url="/reports/create",
                category="报告管理",
                permissions=["report:create"],
                usage_count=156
            ),
            QuickAction(
                action_id="ACT_002",
                title="上传影像",
                description="上传新的医学影像文件",
                icon="ri-upload-line",
                url="/upload",
                category="影像管理",
                permissions=["image:upload"],
                usage_count=89
            ),
            QuickAction(
                action_id="ACT_003",
                title="患者管理",
                description="管理患者信息和档案",
                icon="ri-user-line",
                url="/patients",
                category="患者管理",
                permissions=["patient:manage"],
                usage_count=234
            ),
            QuickAction(
                action_id="ACT_004",
                title="审核报告",
                description="审核待处理的医疗报告",
                icon="ri-check-line",
                url="/reports/review",
                category="审核管理",
                permissions=["report:review"],
                usage_count=67
            ),
            QuickAction(
                action_id="ACT_005",
                title="统计分析",
                description="查看系统统计和分析",
                icon="ri-bar-chart-line",
                url="/reports/analytics",
                category="数据分析",
                permissions=["analytics:view"],
                usage_count=45
            ),
            QuickAction(
                action_id="ACT_006",
                title="系统设置",
                description="配置系统参数和选项",
                icon="ri-settings-line",
                url="/settings",
                category="系统管理",
                permissions=["system:admin"],
                usage_count=23
            )
        ]
        
        # 应用筛选
        if category:
            mock_actions = [a for a in mock_actions if a.category == category]
        
        # 按使用次数排序
        mock_actions.sort(key=lambda x: x.usage_count, reverse=True)
        
        return mock_actions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取快捷操作失败: {str(e)}")

@router.get("/workflows", response_model=List[WorkflowStatus])
async def get_active_workflows(
    status: Optional[str] = Query(None, description="工作流状态筛选"),
    limit: int = Query(10, ge=1, le=50, description="返回数量限制")
):
    """获取活跃工作流状态"""
    try:
        mock_workflows = []
        for i in range(1, min(limit + 1, 6)):
            workflow = WorkflowStatus(
                workflow_id=f"WF_{i:03d}",
                name=random.choice([
                    "报告审核流程", "影像处理流程", "患者入院流程",
                    "数据备份流程", "系统维护流程"
                ]),
                status=random.choice(["running", "paused", "completed", "error"]),
                total_steps=random.randint(3, 8),
                completed_steps=random.randint(1, 6),
                current_step=random.choice([
                    "数据验证", "审核确认", "结果生成", "通知发送", "归档处理"
                ]),
                started_at=datetime.now() - timedelta(hours=random.randint(1, 24)),
                estimated_completion=datetime.now() + timedelta(hours=random.randint(1, 12)) if random.choice([True, False]) else None,
                assigned_users=[f"USER_{j:03d}" for j in range(1, random.randint(2, 5))]
            )
            mock_workflows.append(workflow)
        
        # 应用筛选
        if status:
            mock_workflows = [w for w in mock_workflows if w.status == status]
        
        return mock_workflows
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取工作流状态失败: {str(e)}")

@router.get("/dashboard", response_model=DashboardData)
async def get_complete_dashboard():
    """获取完整的仪表板数据"""
    try:
        # 获取各部分数据
        overview = await get_dashboard_overview()
        recent_tasks = await get_dashboard_tasks(limit=5)
        notifications = await get_dashboard_notifications(limit=10)
        system_metrics = await get_system_metrics()
        quick_actions = await get_quick_actions()
        active_workflows = await get_active_workflows(limit=5)
        
        dashboard = DashboardData(
            overview=overview,
            recent_tasks=recent_tasks,
            notifications=notifications,
            system_metrics=system_metrics,
            quick_actions=quick_actions,
            active_workflows=active_workflows,
            generated_at=datetime.now()
        )
        
        return dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取仪表板数据失败: {str(e)}")

@router.post("/notifications/mark-read", response_model=Dict[str, Any])
async def mark_notifications_read(
    notification_ids: List[str] = Query(..., description="通知ID列表")
):
    """标记通知为已读"""
    try:
        # 模拟标记已读操作
        return {
            "success": True,
            "message": f"已标记{len(notification_ids)}条通知为已读",
            "marked_count": len(notification_ids)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"标记通知失败: {str(e)}")

@router.put("/tasks/{task_id}/status", response_model=Dict[str, Any])
async def update_task_status(
    task_id: str,
    status: TaskStatus,
    progress: Optional[int] = Query(None, ge=0, le=100, description="任务进度")
):
    """更新任务状态"""
    try:
        # 模拟更新任务状态
        return {
            "success": True,
            "message": f"任务{task_id}状态已更新为{status.value}",
            "task_id": task_id,
            "new_status": status.value,
            "progress": progress
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"更新任务状态失败: {str(e)}")
