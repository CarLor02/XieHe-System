"""
影像展示功能测试

测试影像展示、处理、标注等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import tempfile
import os
from PIL import Image
import io

from app.main import app
from app.core.database import get_db
from app.models.user import User
from app.models.patient import Patient

client = TestClient(app)


class TestImageDisplay:
    """影像展示功能测试类"""
    
    @pytest.fixture
    def auth_headers(self):
        """获取认证头"""
        # 模拟登录获取token
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
    def sample_image(self):
        """创建测试图像"""
        # 创建一个简单的测试图像
        img = Image.new('RGB', (512, 512), color='red')
        img_bytes = io.BytesIO()
        img.save(img_bytes, format='JPEG')
        img_bytes.seek(0)
        return img_bytes
    
    def test_image_upload(self, auth_headers, sample_image):
        """测试图像上传"""
        files = {"file": ("test_image.jpg", sample_image, "image/jpeg")}
        data = {
            "patient_id": "1",
            "study_type": "CT",
            "description": "测试影像"
        }
        
        response = client.post(
            "/api/v1/images/upload",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        assert response.status_code in [200, 201]
        result = response.json()
        assert "image_id" in result
        assert result["status"] == "success"
    
    def test_image_list(self, auth_headers):
        """测试影像列表获取"""
        response = client.get(
            "/api/v1/images/",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_image_detail(self, auth_headers):
        """测试影像详情获取"""
        # 先获取影像列表
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            image_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/images/{image_id}",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "id" in result
            assert "file_path" in result
    
    def test_image_preview(self, auth_headers):
        """测试影像预览"""
        # 获取第一个影像进行预览测试
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            image_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/images/{image_id}/preview",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            assert response.headers["content-type"].startswith("image/")
    
    def test_image_processing(self, auth_headers):
        """测试影像处理功能"""
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            image_id = list_response.json()[0]["id"]
            
            # 测试影像处理
            process_data = {
                "operations": [
                    {"type": "resize", "width": 256, "height": 256},
                    {"type": "enhance", "brightness": 1.2}
                ]
            }
            
            response = client.post(
                f"/api/v1/images/{image_id}/process",
                json=process_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "task_id" in result or "processed_image_id" in result
    
    def test_image_annotation(self, auth_headers):
        """测试影像标注功能"""
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            image_id = list_response.json()[0]["id"]
            
            # 创建标注
            annotation_data = {
                "type": "rectangle",
                "coordinates": [100, 100, 200, 200],
                "label": "病灶区域",
                "description": "疑似病变"
            }
            
            response = client.post(
                f"/api/v1/images/{image_id}/annotations",
                json=annotation_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 201]
            result = response.json()
            assert "annotation_id" in result
    
    def test_image_comparison(self, auth_headers):
        """测试影像对比功能"""
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and len(list_response.json()) >= 2:
            images = list_response.json()
            image_ids = [images[0]["id"], images[1]["id"]]
            
            comparison_data = {
                "image_ids": image_ids,
                "comparison_type": "side_by_side"
            }
            
            response = client.post(
                "/api/v1/images/compare",
                json=comparison_data,
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert "comparison_id" in result
    
    def test_dicom_parsing(self, auth_headers):
        """测试DICOM文件解析"""
        # 创建模拟DICOM文件
        dicom_data = b"DICM" + b"\x00" * 128  # 简化的DICOM头
        
        files = {"file": ("test.dcm", io.BytesIO(dicom_data), "application/dicom")}
        data = {
            "patient_id": "1",
            "study_type": "CT"
        }
        
        response = client.post(
            "/api/v1/images/upload/dicom",
            files=files,
            data=data,
            headers=auth_headers
        )
        
        # DICOM解析可能失败，但应该有适当的错误处理
        assert response.status_code in [200, 201, 400, 422]
    
    def test_image_metadata(self, auth_headers):
        """测试影像元数据获取"""
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            image_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/images/{image_id}/metadata",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert isinstance(result, dict)
    
    def test_image_download(self, auth_headers):
        """测试影像下载"""
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            image_id = list_response.json()[0]["id"]
            
            response = client.get(
                f"/api/v1/images/{image_id}/download",
                headers=auth_headers
            )
            
            assert response.status_code == 200
            assert "content-disposition" in response.headers
    
    def test_image_search(self, auth_headers):
        """测试影像搜索功能"""
        search_params = {
            "patient_name": "测试",
            "study_type": "CT",
            "date_from": "2025-01-01",
            "date_to": "2025-12-31"
        }
        
        response = client.get(
            "/api/v1/images/search",
            params=search_params,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_image_statistics(self, auth_headers):
        """测试影像统计功能"""
        response = client.get(
            "/api/v1/images/statistics",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "total_images" in result
        assert "images_by_type" in result
    
    def test_batch_image_operations(self, auth_headers):
        """测试批量影像操作"""
        list_response = client.get("/api/v1/images/", headers=auth_headers)
        if list_response.status_code == 200 and list_response.json():
            image_ids = [img["id"] for img in list_response.json()[:3]]
            
            batch_data = {
                "image_ids": image_ids,
                "operation": "export",
                "format": "zip"
            }
            
            response = client.post(
                "/api/v1/images/batch",
                json=batch_data,
                headers=auth_headers
            )
            
            assert response.status_code in [200, 202]
            result = response.json()
            assert "task_id" in result or "download_url" in result


class TestImageViewer:
    """影像查看器测试类"""
    
    def test_viewer_config(self, auth_headers):
        """测试查看器配置"""
        response = client.get(
            "/api/v1/images/viewer/config",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "window_level" in result
        assert "zoom_levels" in result
    
    def test_viewer_tools(self, auth_headers):
        """测试查看器工具"""
        tools_response = client.get(
            "/api/v1/images/viewer/tools",
            headers=auth_headers
        )
        
        assert tools_response.status_code == 200
        result = tools_response.json()
        assert isinstance(result, list)
        assert any(tool["name"] == "zoom" for tool in result)
        assert any(tool["name"] == "pan" for tool in result)


# 运行测试的辅助函数
def run_image_display_tests():
    """运行影像展示功能测试"""
    import subprocess
    import sys
    
    try:
        # 运行pytest
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
    # 直接运行测试
    test_result = run_image_display_tests()
    print("影像展示功能测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
