"""尚无真实数据源的 Dashboard 指标和任务兼容提供器。"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any


class DemoDashboardSupplementProvider:
    def average_processing_time(self) -> float:
        return 2.5

    def metrics(self) -> list[dict[str, Any]]:
        return [
            {
                "name": "数据库连接数",
                "value": 15.0,
                "unit": "个",
                "status": "normal",
                "trend": "stable",
            },
            {
                "name": "内存使用率",
                "value": 68.5,
                "unit": "%",
                "status": "normal",
                "trend": "up",
            },
            {
                "name": "CPU使用率",
                "value": 45.2,
                "unit": "%",
                "status": "normal",
                "trend": "stable",
            },
            {
                "name": "磁盘使用率",
                "value": 72.8,
                "unit": "%",
                "status": "warning",
                "trend": "up",
            },
        ]

    def tasks(self) -> list[dict[str, Any]]:
        now = datetime.now()
        return [
            {
                "task_id": "TASK_001",
                "title": "审核胸部X光报告",
                "description": "需要审核患者张三的胸部X光检查报告",
                "status": "pending",
                "priority": "high",
                "assigned_to": "USER_001",
                "assigned_to_name": "李医生",
                "created_at": (now - timedelta(hours=2)).isoformat(),
                "due_date": (now + timedelta(days=1)).isoformat(),
                "progress": 0,
                "tags": ["紧急", "审核"],
                "estimated_hours": 2.0,
            },
            {
                "task_id": "TASK_002",
                "title": "处理MRI影像数据",
                "description": "处理患者李四的头部MRI影像数据",
                "status": "in_progress",
                "priority": "normal",
                "assigned_to": "USER_002",
                "assigned_to_name": "王医生",
                "created_at": (now - timedelta(hours=4)).isoformat(),
                "progress": 65,
                "tags": ["影像", "处理"],
                "estimated_hours": 3.0,
                "actual_hours": 2.0,
            },
            {
                "task_id": "TASK_003",
                "title": "更新患者档案",
                "description": "更新患者王五的基本信息和病史记录",
                "status": "completed",
                "priority": "low",
                "assigned_to": "USER_003",
                "assigned_to_name": "赵医生",
                "created_at": (now - timedelta(hours=6)).isoformat(),
                "progress": 100,
                "tags": ["档案", "更新"],
                "estimated_hours": 1.0,
                "actual_hours": 0.8,
            },
        ]
