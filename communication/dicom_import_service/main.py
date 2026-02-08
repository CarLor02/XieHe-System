"""
DICOM批量导入服务 - 独立应用

这是一个独立的FastAPI服务，用于批量导入DICOM文件到XieHe医疗系统

功能：
1. 扫描指定目录下的DICOM文件（按月份/患者ID组织）
2. 提取患者信息和影像数据
3. 将DICOM转换为JPG格式
4. 调用XieHe系统API创建患者和上传影像
5. 基于患者ID+图像名称去重

作者: XieHe Medical System
创建时间: 2026-02-08
"""

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
from pathlib import Path

from config import settings
from import_service import DicomImportService
from models import (
    ImportTaskRequest,
    ImportTaskResponse,
    ImportTaskStatus,
    ImportTaskStats
)

# 创建FastAPI应用
app = FastAPI(
    title="DICOM批量导入服务",
    description="独立的DICOM文件批量导入服务，用于将本地DICOM文件导入到XieHe医疗系统",
    version="1.0.0"
)

# 配置CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 全局任务存储（生产环境应使用Redis）
import_tasks: Dict[str, Dict] = {}


def generate_task_id() -> str:
    """生成任务ID"""
    import uuid
    return f"dicom-import-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{str(uuid.uuid4())[:8]}"


def run_import_task_background(task_id: str, source_path: str):
    """后台运行导入任务"""
    try:
        # 更新任务状态
        import_tasks[task_id]['status'] = 'running'
        import_tasks[task_id]['started_at'] = datetime.now()
        
        # 创建导入服务
        service = DicomImportService(
            backend_url=settings.BACKEND_URL,
            api_token=settings.API_TOKEN
        )
        
        # 执行导入
        stats = service.import_dicom_directory(source_path)
        
        # 更新任务状态为完成
        import_tasks[task_id]['status'] = 'completed'
        import_tasks[task_id]['completed_at'] = datetime.now()
        import_tasks[task_id]['stats'] = stats
        import_tasks[task_id]['duration_seconds'] = (
            import_tasks[task_id]['completed_at'] - import_tasks[task_id]['started_at']
        ).total_seconds()
        
    except Exception as e:
        import_tasks[task_id]['status'] = 'failed'
        import_tasks[task_id]['error'] = str(e)
        import_tasks[task_id]['completed_at'] = datetime.now()


@app.get("/")
async def root():
    """服务根路径"""
    return {
        "service": "DICOM批量导入服务",
        "version": "1.0.0",
        "status": "running",
        "backend_url": settings.BACKEND_URL
    }


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/import", response_model=ImportTaskResponse)
async def start_import(
    request: ImportTaskRequest,
    background_tasks: BackgroundTasks
):
    """
    启动DICOM批量导入任务
    
    - **source_path**: DICOM文件根目录，格式：root_path/YYYY-MM/patient_id/*.dcm
    - **description**: 任务描述（可选）
    """
    # 验证路径
    source_path = Path(request.source_path)
    if not source_path.exists():
        raise HTTPException(status_code=400, detail=f"目录不存在: {request.source_path}")
    
    if not source_path.is_dir():
        raise HTTPException(status_code=400, detail=f"路径不是目录: {request.source_path}")
    
    # 生成任务ID
    task_id = generate_task_id()
    
    # 初始化任务状态
    import_tasks[task_id] = {
        'task_id': task_id,
        'status': 'pending',
        'source_path': str(source_path),
        'description': request.description,
        'created_at': datetime.now(),
        'started_at': None,
        'completed_at': None,
        'stats': None,
        'error': None
    }
    
    # 在后台运行导入任务
    background_tasks.add_task(run_import_task_background, task_id, str(source_path))
    
    return ImportTaskResponse(
        task_id=task_id,
        status='pending',
        message='DICOM导入任务已启动，请通过状态查询接口获取进度',
        started_at=datetime.now()
    )


@app.get("/import/{task_id}/status", response_model=ImportTaskStatus)
async def get_task_status(task_id: str):
    """
    查询导入任务状态

    - **task_id**: 任务ID
    """
    if task_id not in import_tasks:
        raise HTTPException(status_code=404, detail=f"任务不存在: {task_id}")

    task = import_tasks[task_id]
    stats = task.get('stats', {})

    progress = {
        'total_files_scanned': stats.get('total_files_scanned', 0),
        'total_patients_found': stats.get('total_patients_found', 0),
        'new_patients_created': stats.get('new_patients_created', 0),
        'existing_patients_skipped': stats.get('existing_patients_skipped', 0),
        'new_images_uploaded': stats.get('new_images_uploaded', 0),
        'duplicate_images_skipped': stats.get('duplicate_images_skipped', 0),
        'failed_files': stats.get('failed_files', 0)
    }

    return ImportTaskStatus(
        task_id=task_id,
        status=task['status'],
        source_path=task['source_path'],
        description=task.get('description'),
        created_at=task['created_at'],
        started_at=task.get('started_at'),
        completed_at=task.get('completed_at'),
        duration_seconds=task.get('duration_seconds'),
        progress=progress,
        errors=stats.get('errors', [])
    )


@app.get("/import/{task_id}/stats", response_model=ImportTaskStats)
async def get_task_stats(task_id: str):
    """
    获取导入任务详细统计

    - **task_id**: 任务ID
    """
    if task_id not in import_tasks:
        raise HTTPException(status_code=404, detail=f"任务不存在: {task_id}")

    task = import_tasks[task_id]

    if task['status'] not in ['completed', 'failed']:
        raise HTTPException(status_code=400, detail="任务尚未完成，无法获取统计信息")

    stats = task.get('stats', {})

    return ImportTaskStats(
        total_files_scanned=stats.get('total_files_scanned', 0),
        total_patients_found=stats.get('total_patients_found', 0),
        new_patients_created=stats.get('new_patients_created', 0),
        existing_patients_skipped=stats.get('existing_patients_skipped', 0),
        new_images_uploaded=stats.get('new_images_uploaded', 0),
        duplicate_images_skipped=stats.get('duplicate_images_skipped', 0),
        failed_files=stats.get('failed_files', 0),
        errors=stats.get('errors', [])
    )


@app.get("/import/tasks")
async def list_tasks():
    """
    获取所有导入任务列表
    """
    tasks = [
        {
            'task_id': task['task_id'],
            'status': task['status'],
            'source_path': task['source_path'],
            'description': task.get('description'),
            'created_at': task['created_at'],
            'started_at': task.get('started_at'),
            'completed_at': task.get('completed_at'),
            'duration_seconds': task.get('duration_seconds')
        }
        for task in import_tasks.values()
    ]

    # 按创建时间倒序排列
    tasks.sort(key=lambda x: x['created_at'], reverse=True)

    return {
        'total': len(tasks),
        'tasks': tasks
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )

