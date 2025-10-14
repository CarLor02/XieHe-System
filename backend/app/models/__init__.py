"""
数据库模型包

包含所有数据库表的 ORM 模型定义

作者: XieHe Medical System
创建时间: 2025-10-13
"""

from .base import Base
from .user import User, Role, Permission, Department, UserRole, RolePermission
from .patient import Patient, PatientVisit, PatientAllergy, PatientMedicalHistory
from .image import Study, Series, Instance, ImageAnnotation, AITask
from .report import DiagnosticReport, ReportTemplate, ReportFinding, ReportRevision
from .system import SystemConfig, SystemLog, SystemMonitor, SystemAlert, Notification

__all__ = [
    "Base",
    # 用户相关
    "User",
    "Role",
    "Permission",
    "Department",
    "UserRole",
    "RolePermission",
    # 患者相关
    "Patient",
    "PatientVisit",
    "PatientAllergy",
    "PatientMedicalHistory",
    # 影像相关
    "Study",
    "Series",
    "Instance",
    "ImageAnnotation",
    "AITask",
    # 报告相关
    "DiagnosticReport",
    "ReportTemplate",
    "ReportFinding",
    "ReportRevision",
    # 系统相关
    "SystemConfig",
    "SystemLog",
    "SystemMonitor",
    "SystemAlert",
    "Notification",
]

