#!/usr/bin/env python3
"""
XieHe医疗影像诊断系统 - 演示启动脚本

这是一个简化的启动脚本，用于演示系统功能。
跳过复杂的配置和依赖，直接启动核心功能。
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# 设置环境变量
os.environ.setdefault("ENVIRONMENT", "demo")
os.environ.setdefault("DEBUG", "true")

# 简化的FastAPI应用
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn

# 创建FastAPI应用
app = FastAPI(
    title="XieHe医疗影像诊断系统",
    description="基于AI的医疗影像诊断系统演示版",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# 添加CORS中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 健康检查端点
@app.get("/health")
async def health_check():
    """健康检查端点"""
    return {"status": "healthy", "message": "XieHe医疗影像诊断系统运行正常"}

# API根端点
@app.get("/")
async def root():
    """API根端点"""
    return {
        "message": "欢迎使用XieHe医疗影像诊断系统",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

# API v1 路由组
@app.get("/api/v1/")
async def api_v1_root():
    """API v1 根端点"""
    return {
        "message": "XieHe医疗影像诊断系统 API v1",
        "endpoints": {
            "auth": "/api/v1/auth",
            "patients": "/api/v1/patients",
            "images": "/api/v1/images",
            "reports": "/api/v1/reports"
        }
    }

# 认证相关端点
@app.post("/api/v1/auth/login")
async def login():
    """用户登录（演示）"""
    return {
        "access_token": "demo_token_12345",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "username": "demo_user",
            "name": "演示用户",
            "role": "doctor"
        }
    }

# 患者管理端点
@app.get("/api/v1/patients")
async def get_patients():
    """获取患者列表（演示）"""
    return {
        "total": 3,
        "patients": [
            {
                "id": 1,
                "name": "张三",
                "age": 45,
                "gender": "男",
                "phone": "138****1234",
                "created_at": "2024-09-20T10:00:00Z"
            },
            {
                "id": 2,
                "name": "李四",
                "age": 32,
                "gender": "女",
                "phone": "139****5678",
                "created_at": "2024-09-21T14:30:00Z"
            },
            {
                "id": 3,
                "name": "王五",
                "age": 58,
                "gender": "男",
                "phone": "137****9012",
                "created_at": "2024-09-22T09:15:00Z"
            }
        ]
    }

# 影像管理端点
@app.get("/api/v1/images")
async def get_images():
    """获取影像列表（演示）"""
    return {
        "total": 5,
        "images": [
            {
                "id": 1,
                "patient_id": 1,
                "type": "CT",
                "body_part": "胸部",
                "status": "已分析",
                "created_at": "2024-09-20T10:30:00Z"
            },
            {
                "id": 2,
                "patient_id": 1,
                "type": "MRI",
                "body_part": "头部",
                "status": "分析中",
                "created_at": "2024-09-21T15:00:00Z"
            },
            {
                "id": 3,
                "patient_id": 2,
                "type": "X-Ray",
                "body_part": "胸部",
                "status": "已分析",
                "created_at": "2024-09-21T16:20:00Z"
            }
        ]
    }

# 报告管理端点
@app.get("/api/v1/reports")
async def get_reports():
    """获取报告列表（演示）"""
    return {
        "total": 2,
        "reports": [
            {
                "id": 1,
                "patient_id": 1,
                "image_id": 1,
                "title": "胸部CT影像诊断报告",
                "status": "已完成",
                "ai_confidence": 0.95,
                "findings": "未发现明显异常",
                "created_at": "2024-09-20T11:00:00Z"
            },
            {
                "id": 2,
                "patient_id": 2,
                "image_id": 3,
                "title": "胸部X光影像诊断报告",
                "status": "已完成",
                "ai_confidence": 0.88,
                "findings": "左下肺野可见小结节影",
                "created_at": "2024-09-21T17:00:00Z"
            }
        ]
    }

# 系统统计端点 - 真实数据版本
@app.get("/api/v1/dashboard/stats")
async def get_dashboard_stats():
    """获取仪表板统计数据（真实数据）"""
    try:
        # 尝试连接数据库获取真实数据
        import mysql.connector
        from datetime import datetime, date

        # 数据库连接配置
        db_config = {
            'host': 'localhost',
            'port': 3307,
            'user': 'medical_user',
            'password': 'medical_password_2024',
            'database': 'medical_system'
        }

        try:
            # 连接数据库
            conn = mysql.connector.connect(**db_config)
            cursor = conn.cursor()

            # 查询患者总数
            cursor.execute("SELECT COUNT(*) FROM patients WHERE is_deleted = FALSE")
            total_patients = cursor.fetchone()[0] or 0

            # 查询影像总数
            cursor.execute("SELECT COUNT(*) FROM studies")
            total_images = cursor.fetchone()[0] or 0

            # 查询报告总数
            cursor.execute("SELECT COUNT(*) FROM diagnostic_reports WHERE is_deleted = FALSE")
            total_reports = cursor.fetchone()[0] or 0

            # 查询待分析数量
            cursor.execute("SELECT COUNT(*) FROM studies WHERE status IN ('SCHEDULED', 'IN_PROGRESS')")
            pending_analysis = cursor.fetchone()[0] or 0

            # 查询今日处理数量
            today = date.today()
            cursor.execute("SELECT COUNT(*) FROM diagnostic_reports WHERE DATE(created_at) = %s", (today,))
            today_processed = cursor.fetchone()[0] or 0

            cursor.close()
            conn.close()

            return {
                "total_patients": total_patients,
                "total_images": total_images,
                "total_reports": total_reports,
                "pending_analysis": pending_analysis,
                "today_processed": today_processed,
                "ai_accuracy": 0.94,  # 模拟AI准确率
                "system_status": "正常运行"
            }

        except mysql.connector.Error as e:
            print(f"数据库连接错误: {e}")
            # 如果数据库连接失败，返回模拟数据
            return {
                "total_patients": 0,
                "total_images": 0,
                "total_reports": 0,
                "pending_analysis": 0,
                "today_processed": 0,
                "ai_accuracy": 0.94,
                "system_status": "数据库连接失败"
            }

    except ImportError:
        # 如果没有mysql.connector，返回模拟数据
        return {
            "total_patients": 156,
            "total_images": 423,
            "total_reports": 389,
            "pending_analysis": 12,
            "today_processed": 28,
            "ai_accuracy": 0.94,
            "system_status": "演示模式"
        }

if __name__ == "__main__":
    print("🚀 启动XieHe医疗影像诊断系统演示版...")
    print("📊 系统信息:")
    print("   - 名称: XieHe医疗影像诊断系统")
    print("   - 版本: 1.0.0")
    print("   - 模式: 演示模式")
    print("   - 端口: 8000")
    print("🌐 访问地址:")
    print("   - API文档: http://localhost:8000/docs")
    print("   - 健康检查: http://localhost:8000/health")
    print("   - API根路径: http://localhost:8000/api/v1/")
    
    uvicorn.run(
        "start_demo:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
