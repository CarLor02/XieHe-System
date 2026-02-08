"""
DICOM导入服务数据模型

作者: XieHe Medical System
创建时间: 2026-02-08
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, date


class ImportTaskRequest(BaseModel):
    """导入任务请求模型"""
    source_path: str = Field(..., description="DICOM文件根目录路径")
    description: Optional[str] = Field(None, description="任务描述")


class ImportTaskResponse(BaseModel):
    """导入任务响应模型"""
    task_id: str = Field(..., description="任务ID")
    status: str = Field(..., description="任务状态")
    message: str = Field(..., description="响应消息")
    started_at: datetime = Field(..., description="开始时间")


class ImportTaskStatus(BaseModel):
    """导入任务状态模型"""
    task_id: str
    status: str  # pending, running, completed, failed
    source_path: str
    description: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    duration_seconds: Optional[float]
    progress: Dict[str, int]
    errors: List[Dict]


class ImportTaskStats(BaseModel):
    """导入任务统计模型"""
    total_files_scanned: int = 0
    total_patients_found: int = 0
    new_patients_created: int = 0
    existing_patients_skipped: int = 0
    new_images_uploaded: int = 0
    duplicate_images_skipped: int = 0
    failed_files: int = 0
    errors: List[Dict] = []


class PatientInfo(BaseModel):
    """患者信息模型（从DICOM提取）"""
    patient_id: str
    name: str
    gender: str  # MALE, FEMALE, OTHER, UNKNOWN
    birth_date: Optional[date]
    age: Optional[int]


class ImageMetadata(BaseModel):
    """影像元数据模型（从DICOM提取）"""
    modality: Optional[str] = "XR"  # 默认为X光
    study_date: Optional[datetime]
    description: Optional[str]
    series_description: Optional[str]
    study_instance_uid: Optional[str]
    series_instance_uid: Optional[str]
    sop_instance_uid: Optional[str]


class PatientCreateRequest(BaseModel):
    """创建患者请求模型（调用后端API）"""
    patient_id: str
    name: str
    gender: str
    birth_date: Optional[date]
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None


class ImageUploadRequest(BaseModel):
    """上传影像请求模型（调用后端API）"""
    patient_id: str
    description: Optional[str]

