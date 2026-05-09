"""
AI模型功能测试

测试模型管理、推理等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
import tempfile
import os
import json
from unittest.mock import Mock, patch

from app.main import app
from app.services.model_monitoring_service import model_monitoring_service

client = TestClient(app)


class TestAIModels:
    """AI模型功能测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    @pytest.fixture
    def sample_model_file(self):
        """创建测试模型文件"""
        with tempfile.NamedTemporaryFile(suffix=".pkl", delete=False) as f:
            f.write(b"fake model data")
            return f.name
    
    def test_model_upload(self, auth_headers, sample_model_file):
        """测试模型上传"""
        with open(sample_model_file, 'rb') as f:
            files = {"file": ("test_model.pkl", f, "application/octet-stream")}
            data = {
                "name": "测试模型",
                "version": "1.0.0",
                "description": "用于测试的AI模型",
                "model_type": "classification"
            }
            
            response = client.post(
                "/api/v1/models/upload",
                files=files,
                data=data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 201]
            result = response.json()
            assert "model_id" in result
            assert result["status"] == "uploaded"
        
        # 清理临时文件
        os.unlink(sample_model_file)
    
    def test_model_list(self, auth_headers):
        """测试模型列表获取"""
        response = client.get(
            "/api/v1/models/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_model_detail(self, auth_headers):
        """测试模型详情获取"""
        # 先获取模型列表
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/models/{model_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "id" in result
            assert "name" in result
            assert "status" in result
    
    def test_model_deployment(self, auth_headers):
        """测试模型部署"""
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            deploy_data = {
                "deployment_config": {
                    "cpu_limit": "1000m",
                    "memory_limit": "2Gi",
                    "replicas": 1
                }
            }
            
            response = client.post(
                f"/api/v1/models/{model_id}/deploy",
                json=deploy_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "deployment_id" in result or "status" in result
    
    def test_model_inference(self, auth_headers):
        """测试模型推理"""
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            # 模拟推理数据
            inference_data = {
                "input_data": {
                    "image_path": "/path/to/test/image.jpg",
                    "preprocessing": {
                        "resize": [224, 224],
                        "normalize": True
                    }
                },
                "parameters": {
                    "confidence_threshold": 0.8
                }
            }
            
            response = client.post(
                f"/api/v1/models/{model_id}/inference",
                json=inference_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "task_id" in result or "predictions" in result
    
    def test_model_batch_inference(self, auth_headers):
        """测试批量推理"""
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            batch_data = {
                "batch_input": [
                    {"image_path": "/path/to/image1.jpg"},
                    {"image_path": "/path/to/image2.jpg"},
                    {"image_path": "/path/to/image3.jpg"}
                ],
                "batch_size": 3
            }
            
            response = client.post(
                f"/api/v1/models/{model_id}/batch_inference",
                json=batch_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "batch_task_id" in result
    
    def test_model_performance_metrics(self, auth_headers):
        """测试模型性能指标"""
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/models/{model_id}/metrics",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert isinstance(result, dict)
    
    def test_model_version_management(self, auth_headers):
        """测试模型版本管理"""
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            # 获取模型版本
            response = client.get(
                f"/api/v1/models/{model_id}/versions",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert isinstance(result, list)
    
    def test_model_status_check(self, auth_headers):
        """测试模型状态检查"""
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/models/{model_id}/status",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "status" in result
            assert "health" in result
    
    def test_model_configuration(self, auth_headers):
        """测试模型配置管理"""
        list_response = client.get("/api/v1/models/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            model_id = list_response.json()[0]["id"]
            
            # 更新模型配置
            config_data = {
                "inference_config": {
                    "batch_size": 8,
                    "timeout": 30,
                    "gpu_enabled": True
                },
                "preprocessing_config": {
                    "resize_method": "bilinear",
                    "normalization": "z_score"
                }
            }
            
            response = client.put(
                f"/api/v1/models/{model_id}/config",
                json=config_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "message" in result


class TestModelMonitoring:
    """模型监控测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    @pytest.mark.asyncio
    async def test_model_monitoring_service(self):
        """测试模型监控服务"""
        # 启动监控服务
        await model_monitoring_service.start()
        
        # 记录一些测试指标
        await model_monitoring_service.record_inference_time(
            model_id="test_model_1",
            model_name="测试模型1",
            inference_time=1.5
        )
        
        await model_monitoring_service.record_model_accuracy(
            model_id="test_model_1",
            model_name="测试模型1",
            accuracy=0.95
        )
        
        await model_monitoring_service.record_model_error(
            model_id="test_model_1",
            model_name="测试模型1",
            error_type="ValidationError",
            error_message="输入数据格式错误"
        )
        
        # 获取模型状态
        status = model_monitoring_service.get_model_status("test_model_1")
        assert isinstance(status, dict)
        
        # 获取模型指标
        metrics = model_monitoring_service.get_model_metrics("test_model_1")
        assert isinstance(metrics, list)
        
        # 获取模型错误
        errors = model_monitoring_service.get_model_errors("test_model_1")
        assert isinstance(errors, list)
        assert len(errors) > 0
        
        # 停止监控服务
        await model_monitoring_service.stop()
    
    def test_model_monitoring_api(self, auth_headers):
        """测试模型监控API"""
        response = client.get(
            "/api/v1/models/monitoring/status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, dict)
    
    def test_model_health_check(self, auth_headers):
        """测试模型健康检查"""
        response = client.get(
            "/api/v1/models/health",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "healthy_models" in result
        assert "unhealthy_models" in result


class TestModelIntegration:
    """模型集成测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def test_model_image_integration(self, auth_headers):
        """测试模型与影像系统集成"""
        # 获取影像列表
        images_response = client.get("/api/v1/images/", headers=auth_headers)
        if images_response.status_code == 200 and images_response.json():
            image_id = images_response.json()[0]["id"]
            
            # 对影像进行AI分析
            analysis_data = {
                "image_id": image_id,
                "analysis_type": "classification",
                "model_preferences": ["latest", "high_accuracy"]
            }
            
            response = client.post(
                "/api/v1/images/ai_analysis",
                json=analysis_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "analysis_id" in result or "task_id" in result
    
    def test_model_report_integration(self, auth_headers):
        """测试模型与报告系统集成"""
        # 获取报告列表
        reports_response = client.get("/api/v1/reports/", headers=auth_headers)
        if reports_response.status_code == 200 and reports_response.json():
            report_id = reports_response.json()[0]["id"]
            
            # 为报告生成AI建议
            suggestion_data = {
                "report_id": report_id,
                "suggestion_type": "diagnosis_assistance"
            }
            
            response = client.post(
                "/api/v1/reports/ai_suggestions",
                json=suggestion_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "suggestions" in result or "task_id" in result


# 运行测试的辅助函数
def run_ai_model_tests():
    """运行AI模型功能测试"""
    import subprocess
    import sys
    
    try:
        result = subprocess.run([
            sys.executable, "-m", "pytest", 
            __file__, 
            "-v", 
            "--tb=short"
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
    test_result = run_ai_model_tests()
    print("AI模型功能测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
