"""
报告系统测试

测试报告生成、编辑、导出等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
import tempfile
import os
import json
from datetime import datetime

from app.main import app

client = TestClient(app)


class TestReports:
    """报告系统测试类"""
    
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
    
    def test_report_creation(self, auth_headers):
        """测试报告创建"""
        report_data = {
            "patient_id": "1",
            "study_id": "study_001",
            "report_type": "CT",
            "title": "胸部CT检查报告",
            "findings": "双肺纹理清晰，未见明显异常",
            "impression": "双肺未见明显异常",
            "recommendations": "建议定期复查"
        }
        
        response = client.post(
            "/api/v1/reports/",
            json=report_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        result = response.json()
        assert "report_id" in result
        assert result["status"] == "created"
    
    def test_report_list(self, auth_headers):
        """测试报告列表获取"""
        response = client.get(
            "/api/v1/reports/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_report_detail(self, auth_headers):
        """测试报告详情获取"""
        # 先获取报告列表
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/reports/{report_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "id" in result
            assert "title" in result
            assert "findings" in result
    
    def test_report_update(self, auth_headers):
        """测试报告更新"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            update_data = {
                "findings": "更新后的检查所见",
                "impression": "更新后的诊断印象",
                "recommendations": "更新后的建议"
            }
            
            response = client.put(
                f"/api/v1/reports/{report_id}",
                json=update_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["message"] == "报告更新成功"
    
    def test_report_template_generation(self, auth_headers):
        """测试基于模板的报告生成"""
        template_data = {
            "template_id": "ct_chest_template",
            "patient_id": "1",
            "study_data": {
                "study_date": "2025-09-25",
                "modality": "CT",
                "body_part": "CHEST"
            },
            "auto_fill_data": {
                "patient_age": 45,
                "patient_gender": "M",
                "clinical_history": "胸痛"
            }
        }
        
        response = client.post(
            "/api/v1/reports/generate",
            json=template_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        result = response.json()
        assert "report_id" in result
        assert "template_applied" in result
    
    def test_report_export_pdf(self, auth_headers):
        """测试报告PDF导出"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            export_data = {
                "format": "pdf",
                "include_images": True,
                "watermark": "XieHe Medical System"
            }
            
            response = client.post(
                f"/api/v1/reports/{report_id}/export",
                json=export_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "download_url" in result or "task_id" in result
    
    def test_report_export_word(self, auth_headers):
        """测试报告Word导出"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            export_data = {
                "format": "docx",
                "template_style": "standard",
                "include_signature": True
            }
            
            response = client.post(
                f"/api/v1/reports/{report_id}/export",
                json=export_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "download_url" in result or "task_id" in result
    
    def test_report_approval_workflow(self, auth_headers):
        """测试报告审核流程"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            # 提交审核
            submit_data = {
                "action": "submit_for_review",
                "reviewer_id": "reviewer_001",
                "comments": "请审核此报告"
            }
            
            response = client.post(
                f"/api/v1/reports/{report_id}/workflow",
                json=submit_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "workflow_status" in result
    
    def test_report_signature(self, auth_headers):
        """测试报告签名"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            signature_data = {
                "signature_type": "digital",
                "signature_data": "base64_encoded_signature",
                "signer_info": {
                    "name": "张医生",
                    "title": "主治医师",
                    "license_number": "12345678"
                }
            }
            
            response = client.post(
                f"/api/v1/reports/{report_id}/sign",
                json=signature_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["message"] == "报告签名成功"
    
    def test_report_statistics(self, auth_headers):
        """测试报告统计"""
        params = {
            "date_from": "2025-01-01",
            "date_to": "2025-12-31",
            "report_type": "CT"
        }
        
        response = client.get(
            "/api/v1/reports/statistics",
            params=params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "total_reports" in result
        assert "reports_by_type" in result
        assert "reports_by_status" in result
    
    def test_report_search(self, auth_headers):
        """测试报告搜索"""
        search_params = {
            "patient_name": "测试",
            "report_type": "CT",
            "date_from": "2025-01-01",
            "date_to": "2025-12-31",
            "keywords": "肺部"
        }
        
        response = client.get(
            "/api/v1/reports/search",
            params=search_params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_report_version_control(self, auth_headers):
        """测试报告版本控制"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            # 获取报告版本历史
            response = client.get(
                f"/api/v1/reports/{report_id}/versions",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert isinstance(result, list)
    
    def test_report_collaboration(self, auth_headers):
        """测试报告协作功能"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            # 添加协作者
            collaboration_data = {
                "collaborator_id": "doctor_002",
                "permission": "edit",
                "message": "请协助完成此报告"
            }
            
            response = client.post(
                f"/api/v1/reports/{report_id}/collaborators",
                json=collaboration_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 201]
            result = response.json()
            assert "collaboration_id" in result
    
    def test_report_comments(self, auth_headers):
        """测试报告评论功能"""
        list_response = client.get("/api/v1/reports/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            report_id = list_response.json()[0]["id"]
            
            # 添加评论
            comment_data = {
                "content": "建议补充影像学表现描述",
                "comment_type": "suggestion",
                "section": "findings"
            }
            
            response = client.post(
                f"/api/v1/reports/{report_id}/comments",
                json=comment_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 201]
            result = response.json()
            assert "comment_id" in result


class TestReportTemplates:
    """报告模板测试类"""
    
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
    
    def test_template_list(self, auth_headers):
        """测试模板列表"""
        response = client.get(
            "/api/v1/reports/templates/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_template_creation(self, auth_headers):
        """测试模板创建"""
        template_data = {
            "name": "胸部CT检查模板",
            "category": "CT",
            "body_part": "CHEST",
            "template_content": {
                "sections": [
                    {
                        "name": "检查技术",
                        "content": "平扫+增强扫描",
                        "required": True
                    },
                    {
                        "name": "检查所见",
                        "content": "{{findings_placeholder}}",
                        "required": True
                    },
                    {
                        "name": "诊断印象",
                        "content": "{{impression_placeholder}}",
                        "required": True
                    }
                ]
            }
        }
        
        response = client.post(
            "/api/v1/reports/templates/",
            json=template_data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        result = response.json()
        assert "template_id" in result
    
    def test_template_usage_statistics(self, auth_headers):
        """测试模板使用统计"""
        response = client.get(
            "/api/v1/reports/templates/statistics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "template_usage" in result


# 运行测试的辅助函数
def run_report_tests():
    """运行报告系统测试"""
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
    test_result = run_report_tests()
    print("报告系统测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
