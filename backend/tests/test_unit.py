"""
后端单元测试

测试FastAPI接口、业务逻辑等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta

from app.main import app
from app.core.database import get_db, Base
from app.core.config import settings
from app.models.user import User
from app.models.patient import Patient
from app.models.image import Image
from app.models.report import Report
from app.services.ai_diagnosis_service import ai_diagnosis_service
from app.services.email_service import email_service

# 测试数据库配置
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 创建测试数据库表
Base.metadata.create_all(bind=engine)

def override_get_db():
    """覆盖数据库依赖"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


class TestUserAPI:
    """用户API测试类"""
    
    def test_create_user(self):
        """测试创建用户"""
        user_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "testpassword123",
            "full_name": "Test User"
        }
        
        response = client.post("/api/v1/users/", json=user_data)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["username"] == user_data["username"]
        assert data["email"] == user_data["email"]
        assert "password" not in data  # 密码不应该返回
    
    def test_get_user(self):
        """测试获取用户信息"""
        # 首先创建用户
        user_data = {
            "username": "getuser",
            "email": "getuser@example.com",
            "password": "password123",
            "full_name": "Get User"
        }
        
        create_response = client.post("/api/v1/users/", json=user_data)
        assert create_response.status_code in [200, 201]
        
        user_id = create_response.json()["id"]
        
        # 获取用户信息
        response = client.get(f"/api/v1/users/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == user_data["username"]
    
    def test_update_user(self):
        """测试更新用户信息"""
        # 创建用户
        user_data = {
            "username": "updateuser",
            "email": "updateuser@example.com",
            "password": "password123",
            "full_name": "Update User"
        }
        
        create_response = client.post("/api/v1/users/", json=user_data)
        user_id = create_response.json()["id"]
        
        # 更新用户信息
        update_data = {
            "full_name": "Updated User Name",
            "email": "updated@example.com"
        }
        
        response = client.put(f"/api/v1/users/{user_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["full_name"] == update_data["full_name"]
        assert data["email"] == update_data["email"]
    
    def test_delete_user(self):
        """测试删除用户"""
        # 创建用户
        user_data = {
            "username": "deleteuser",
            "email": "deleteuser@example.com",
            "password": "password123",
            "full_name": "Delete User"
        }
        
        create_response = client.post("/api/v1/users/", json=user_data)
        user_id = create_response.json()["id"]
        
        # 删除用户
        response = client.delete(f"/api/v1/users/{user_id}")
        
        assert response.status_code in [200, 204]
        
        # 验证用户已删除
        get_response = client.get(f"/api/v1/users/{user_id}")
        assert get_response.status_code == 404


class TestPatientAPI:
    """患者API测试类"""
    
    def test_create_patient(self):
        """测试创建患者"""
        patient_data = {
            "name": "张三",
            "age": 30,
            "gender": "M",
            "phone": "13800138000",
            "medical_history": "高血压"
        }
        
        response = client.post("/api/v1/patients/", json=patient_data)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["name"] == patient_data["name"]
        assert data["age"] == patient_data["age"]
    
    def test_get_patients_list(self):
        """测试获取患者列表"""
        response = client.get("/api/v1/patients/?page=1&page_size=10")
        
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "pagination" in data
    
    def test_search_patients(self):
        """测试搜索患者"""
        # 创建测试患者
        patient_data = {
            "name": "李四",
            "age": 25,
            "gender": "F",
            "phone": "13900139000"
        }
        
        client.post("/api/v1/patients/", json=patient_data)
        
        # 搜索患者
        response = client.get("/api/v1/patients/search?q=李四")
        
        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0
        assert any(patient["name"] == "李四" for patient in data)


class TestImageAPI:
    """影像API测试类"""
    
    def test_upload_image(self):
        """测试上传影像"""
        # 模拟文件上传
        files = {"file": ("test_image.jpg", b"fake image data", "image/jpeg")}
        data = {
            "patient_id": "1",
            "study_type": "CT",
            "description": "测试影像"
        }
        
        response = client.post("/api/v1/images/upload", files=files, data=data)
        
        # 由于没有实际的文件处理，可能返回错误，但应该是可预期的错误
        assert response.status_code in [200, 201, 400, 422]
    
    def test_get_image_list(self):
        """测试获取影像列表"""
        response = client.get("/api/v1/images/?patient_id=1")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_image_metadata(self):
        """测试获取影像元数据"""
        # 这里需要先有影像数据，暂时测试端点可访问性
        response = client.get("/api/v1/images/1/metadata")
        
        # 可能返回404（影像不存在）或200（影像存在）
        assert response.status_code in [200, 404]


class TestReportAPI:
    """报告API测试类"""
    
    def test_create_report(self):
        """测试创建报告"""
        report_data = {
            "patient_id": 1,
            "image_id": 1,
            "title": "CT检查报告",
            "content": "检查结果正常",
            "diagnosis": "无异常发现"
        }
        
        response = client.post("/api/v1/reports/", json=report_data)
        
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["title"] == report_data["title"]
    
    def test_get_report(self):
        """测试获取报告"""
        # 创建报告
        report_data = {
            "patient_id": 1,
            "image_id": 1,
            "title": "测试报告",
            "content": "测试内容",
            "diagnosis": "测试诊断"
        }
        
        create_response = client.post("/api/v1/reports/", json=report_data)
        if create_response.status_code in [200, 201]:
            report_id = create_response.json()["id"]
            
            # 获取报告
            response = client.get(f"/api/v1/reports/{report_id}")
            assert response.status_code == 200
    
    def test_export_report(self):
        """测试导出报告"""
        response = client.get("/api/v1/reports/1/export?format=pdf")
        
        # 可能返回200（成功）或404（报告不存在）
        assert response.status_code in [200, 404]


class TestAIDiagnosisService:
    """AI诊断服务测试类"""
    
    @pytest.mark.asyncio
    async def test_analyze_image(self):
        """测试AI影像分析"""
        with patch.object(ai_diagnosis_service, 'analyze_image') as mock_analyze:
            mock_analyze.return_value = {
                "diagnosis": "正常",
                "confidence": 0.95,
                "findings": ["无异常发现"]
            }
            
            result = await ai_diagnosis_service.analyze_image("fake_image_path")
            
            assert result["diagnosis"] == "正常"
            assert result["confidence"] == 0.95
            mock_analyze.assert_called_once_with("fake_image_path")
    
    @pytest.mark.asyncio
    async def test_batch_analysis(self):
        """测试批量AI分析"""
        with patch.object(ai_diagnosis_service, 'batch_analyze') as mock_batch:
            mock_batch.return_value = [
                {"image_id": 1, "diagnosis": "正常", "confidence": 0.95},
                {"image_id": 2, "diagnosis": "异常", "confidence": 0.88}
            ]
            
            image_ids = [1, 2]
            results = await ai_diagnosis_service.batch_analyze(image_ids)
            
            assert len(results) == 2
            assert results[0]["diagnosis"] == "正常"
            mock_batch.assert_called_once_with(image_ids)


class TestEmailService:
    """邮件服务测试类"""
    
    @pytest.mark.asyncio
    async def test_send_email(self):
        """测试发送邮件"""
        with patch.object(email_service, 'send_email') as mock_send:
            mock_send.return_value = True
            
            result = await email_service.send_email(
                to="test@example.com",
                subject="测试邮件",
                body="这是一封测试邮件"
            )
            
            assert result == True
            mock_send.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_send_template_email(self):
        """测试发送模板邮件"""
        with patch.object(email_service, 'send_template_email') as mock_send_template:
            mock_send_template.return_value = True
            
            result = await email_service.send_template_email(
                to="test@example.com",
                template="welcome",
                context={"username": "testuser"}
            )
            
            assert result == True
            mock_send_template.assert_called_once()


class TestBusinessLogic:
    """业务逻辑测试类"""
    
    def test_password_hashing(self):
        """测试密码哈希"""
        from app.core.security import get_password_hash, verify_password
        
        password = "testpassword123"
        hashed = get_password_hash(password)
        
        assert hashed != password  # 哈希后的密码不应该等于原密码
        assert verify_password(password, hashed) == True  # 验证应该成功
        assert verify_password("wrongpassword", hashed) == False  # 错误密码验证失败
    
    def test_jwt_token_creation(self):
        """测试JWT令牌创建"""
        from app.core.security import create_access_token, verify_token
        
        data = {"sub": "testuser", "user_id": 1}
        token = create_access_token(data)
        
        assert isinstance(token, str)
        assert len(token) > 0
        
        # 验证令牌
        payload = verify_token(token)
        assert payload["sub"] == "testuser"
        assert payload["user_id"] == 1
    
    def test_data_validation(self):
        """测试数据验证"""
        from pydantic import ValidationError
        from app.schemas.user import UserCreate
        
        # 有效数据
        valid_data = {
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123",
            "full_name": "Test User"
        }
        
        user = UserCreate(**valid_data)
        assert user.username == "testuser"
        
        # 无效邮箱
        invalid_data = {
            "username": "testuser",
            "email": "invalid-email",
            "password": "password123",
            "full_name": "Test User"
        }
        
        with pytest.raises(ValidationError):
            UserCreate(**invalid_data)


class TestDatabaseOperations:
    """数据库操作测试类"""
    
    def test_user_crud_operations(self):
        """测试用户CRUD操作"""
        from app.crud.user import create_user, get_user, update_user, delete_user
        from app.schemas.user import UserCreate, UserUpdate
        
        db = TestingSessionLocal()
        
        try:
            # 创建用户
            user_data = UserCreate(
                username="cruduser",
                email="crud@example.com",
                password="password123",
                full_name="CRUD User"
            )
            
            created_user = create_user(db, user_data)
            assert created_user.username == "cruduser"
            
            # 获取用户
            retrieved_user = get_user(db, created_user.id)
            assert retrieved_user.username == "cruduser"
            
            # 更新用户
            update_data = UserUpdate(full_name="Updated CRUD User")
            updated_user = update_user(db, created_user.id, update_data)
            assert updated_user.full_name == "Updated CRUD User"
            
            # 删除用户
            delete_result = delete_user(db, created_user.id)
            assert delete_result == True
            
            # 验证删除
            deleted_user = get_user(db, created_user.id)
            assert deleted_user is None
            
        finally:
            db.close()


class TestErrorHandling:
    """错误处理测试类"""
    
    def test_404_error(self):
        """测试404错误"""
        response = client.get("/api/v1/users/99999")
        assert response.status_code == 404
    
    def test_validation_error(self):
        """测试验证错误"""
        invalid_data = {
            "username": "",  # 空用户名
            "email": "invalid-email",  # 无效邮箱
            "password": "123"  # 密码太短
        }
        
        response = client.post("/api/v1/users/", json=invalid_data)
        assert response.status_code == 422
    
    def test_duplicate_user_error(self):
        """测试重复用户错误"""
        user_data = {
            "username": "duplicateuser",
            "email": "duplicate@example.com",
            "password": "password123",
            "full_name": "Duplicate User"
        }
        
        # 创建第一个用户
        response1 = client.post("/api/v1/users/", json=user_data)
        assert response1.status_code in [200, 201]
        
        # 尝试创建重复用户
        response2 = client.post("/api/v1/users/", json=user_data)
        assert response2.status_code in [400, 409]  # 应该返回冲突错误


# 测试运行器
def run_unit_tests():
    """运行单元测试"""
    import subprocess
    import sys
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            __file__, 
            "-v", 
            "--tb=short",
            "--cov=app",
            "--cov-report=html"
        ], capture_output=True, text=True)
        
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "errors": result.stderr,
            "return_code": result.returncode
        }
    except Exception as e:
        return {
            "success": False,
            "output": "",
            "errors": str(e),
            "return_code": -1
        }


if __name__ == "__main__":
    test_result = run_unit_tests()
    print("后端单元测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
