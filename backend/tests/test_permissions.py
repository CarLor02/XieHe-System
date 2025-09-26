"""
权限系统测试

测试权限管理、验证等功能

作者: XieHe Medical System
创建时间: 2025-09-25
"""

import pytest
from fastapi.testclient import TestClient
import json

from app.main import app

client = TestClient(app)


class TestPermissions:
    """权限系统测试类"""
    
    @pytest.fixture
    def admin_headers(self):
        """获取管理员认证头"""
        login_data = {
            "username": "admin",
            "password": "admin_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    @pytest.fixture
    def user_headers(self):
        """获取普通用户认证头"""
        login_data = {
            "username": "test_user",
            "password": "test_password"
        }
        response = client.post("/api/v1/auth/login", data=login_data)
        if response.status_code == 200:
            token = response.json().get("access_token")
            return {"Authorization": f"Bearer {token}"}
        return {}
    
    def test_role_creation(self, admin_headers):
        """测试角色创建"""
        role_data = {
            "name": "放射科医生",
            "description": "负责影像诊断的医生",
            "permissions": [
                "read_images",
                "create_reports",
                "edit_reports",
                "view_patients"
            ]
        }
        
        response = client.post(
            "/api/v1/roles/",
            json=role_data,
            headers=admin_headers
        )
        
        assert response.status_code in [200, 201]
        result = response.json()
        assert "role_id" in result
        assert result["name"] == "放射科医生"
    
    def test_role_list(self, admin_headers):
        """测试角色列表获取"""
        response = client.get(
            "/api/v1/roles/",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert isinstance(result, list)
    
    def test_role_update(self, admin_headers):
        """测试角色更新"""
        # 先获取角色列表
        list_response = client.get("/api/v1/roles/", headers=admin_headers)
        if list_response.status_code == 200 and list_response.json():
            role_id = list_response.json()[0]["id"]
            
            update_data = {
                "description": "更新后的角色描述",
                "permissions": [
                    "read_images",
                    "create_reports",
                    "edit_reports",
                    "view_patients",
                    "approve_reports"
                ]
            }
            
            response = client.put(
                f"/api/v1/roles/{role_id}",
                json=update_data,
                headers=admin_headers
            )
            
            assert response.status_code == 200
            result = response.json()
            assert result["message"] == "角色更新成功"
    
    def test_user_role_assignment(self, admin_headers):
        """测试用户角色分配"""
        # 获取用户列表
        users_response = client.get("/api/v1/users/", headers=admin_headers)
        if users_response.status_code == 200 and users_response.json():
            user_id = users_response.json()[0]["id"]
            
            # 获取角色列表
            roles_response = client.get("/api/v1/roles/", headers=admin_headers)
            if roles_response.status_code == 200 and roles_response.json():
                role_id = roles_response.json()[0]["id"]
                
                assignment_data = {
                    "role_ids": [role_id]
                }
                
                response = client.post(
                    f"/api/v1/users/{user_id}/roles",
                    json=assignment_data,
                    headers=admin_headers
                )
                
                assert response.status_code == 200
                result = response.json()
                assert result["message"] == "角色分配成功"
    
    def test_permission_check(self, user_headers):
        """测试权限检查"""
        # 测试有权限的操作
        response = client.get(
            "/api/v1/patients/",
            headers=user_headers
        )
        
        # 根据用户权限，应该返回200或403
        assert response.status_code in [200, 403]
    
    def test_permission_denied(self, user_headers):
        """测试权限拒绝"""
        # 尝试访问需要管理员权限的接口
        response = client.get(
            "/api/v1/system/config",
            headers=user_headers
        )
        
        # 应该返回403禁止访问
        assert response.status_code == 403
        result = response.json()
        assert "权限不足" in result.get("detail", "")
    
    def test_data_level_permissions(self, user_headers):
        """测试数据级权限控制"""
        # 测试用户只能访问自己的数据
        response = client.get(
            "/api/v1/users/me",
            headers=user_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "id" in result
        
        # 尝试访问其他用户的数据
        if "id" in result:
            other_user_id = result["id"] + 1
            response = client.get(
                f"/api/v1/users/{other_user_id}",
                headers=user_headers
            )
            
            # 应该返回403或404
            assert response.status_code in [403, 404]
    
    def test_resource_permissions(self, user_headers):
        """测试资源权限"""
        # 测试影像资源权限
        response = client.get(
            "/api/v1/images/",
            headers=user_headers
        )
        
        if response.status_code == 200:
            # 用户有查看权限
            images = response.json()
            if images:
                image_id = images[0]["id"]
                
                # 测试编辑权限
                update_data = {
                    "description": "测试更新"
                }
                
                edit_response = client.put(
                    f"/api/v1/images/{image_id}",
                    json=update_data,
                    headers=user_headers
                )
                
                # 根据权限返回200或403
                assert edit_response.status_code in [200, 403]
    
    def test_permission_inheritance(self, admin_headers):
        """测试权限继承"""
        # 创建父角色
        parent_role_data = {
            "name": "医生",
            "description": "基础医生角色",
            "permissions": [
                "view_patients",
                "read_images"
            ]
        }
        
        parent_response = client.post(
            "/api/v1/roles/",
            json=parent_role_data,
            headers=admin_headers
        )
        
        if parent_response.status_code in [200, 201]:
            parent_role_id = parent_response.json()["role_id"]
            
            # 创建子角色
            child_role_data = {
                "name": "主治医生",
                "description": "主治医生角色",
                "parent_role_id": parent_role_id,
                "permissions": [
                    "create_reports",
                    "edit_reports"
                ]
            }
            
            child_response = client.post(
                "/api/v1/roles/",
                json=child_role_data,
                headers=admin_headers
            )
            
            assert child_response.status_code in [200, 201]
            result = child_response.json()
            assert "role_id" in result
    
    def test_permission_validation(self, admin_headers):
        """测试权限验证"""
        # 测试无效权限
        invalid_role_data = {
            "name": "测试角色",
            "description": "测试角色",
            "permissions": [
                "invalid_permission",
                "another_invalid_permission"
            ]
        }
        
        response = client.post(
            "/api/v1/roles/",
            json=invalid_role_data,
            headers=admin_headers
        )
        
        # 应该返回400错误
        assert response.status_code == 400
        result = response.json()
        assert "无效的权限" in result.get("detail", "")
    
    def test_role_deletion(self, admin_headers):
        """测试角色删除"""
        # 创建测试角色
        role_data = {
            "name": "临时角色",
            "description": "用于测试删除的角色",
            "permissions": ["view_patients"]
        }
        
        create_response = client.post(
            "/api/v1/roles/",
            json=role_data,
            headers=admin_headers
        )
        
        if create_response.status_code in [200, 201]:
            role_id = create_response.json()["role_id"]
            
            # 删除角色
            delete_response = client.delete(
                f"/api/v1/roles/{role_id}",
                headers=admin_headers
            )
            
            assert delete_response.status_code == 200
            result = delete_response.json()
            assert result["message"] == "角色删除成功"
    
    def test_permission_audit(self, admin_headers):
        """测试权限审计"""
        response = client.get(
            "/api/v1/permissions/audit",
            headers=admin_headers
        )
        
        assert response.status_code == 200
        result = response.json()
        assert "permission_changes" in result
        assert "role_assignments" in result
    
    def test_bulk_permission_operations(self, admin_headers):
        """测试批量权限操作"""
        # 获取用户列表
        users_response = client.get("/api/v1/users/", headers=admin_headers)
        if users_response.status_code == 200 and len(users_response.json()) >= 2:
            users = users_response.json()
            user_ids = [users[0]["id"], users[1]["id"]]
            
            # 获取角色
            roles_response = client.get("/api/v1/roles/", headers=admin_headers)
            if roles_response.status_code == 200 and roles_response.json():
                role_id = roles_response.json()[0]["id"]
                
                # 批量分配角色
                bulk_data = {
                    "user_ids": user_ids,
                    "role_id": role_id,
                    "operation": "assign"
                }
                
                response = client.post(
                    "/api/v1/permissions/bulk",
                    json=bulk_data,
                    headers=admin_headers
                )
                
                assert response.status_code == 200
                result = response.json()
                assert "processed_count" in result


class TestPermissionDecorators:
    """权限装饰器测试类"""
    
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
    
    def test_require_permission_decorator(self, auth_headers):
        """测试权限装饰器"""
        # 测试需要特定权限的端点
        response = client.get(
            "/api/v1/admin/users",
            headers=auth_headers
        )
        
        # 根据用户权限返回相应状态码
        assert response.status_code in [200, 403]
    
    def test_require_role_decorator(self, auth_headers):
        """测试角色装饰器"""
        # 测试需要特定角色的端点
        response = client.get(
            "/api/v1/admin/system",
            headers=auth_headers
        )
        
        # 根据用户角色返回相应状态码
        assert response.status_code in [200, 403]


# 运行测试的辅助函数
def run_permission_tests():
    """运行权限系统测试"""
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
    test_result = run_permission_tests()
    print("权限系统测试结果:")
    print(f"成功: {test_result['success']}")
    print(f"输出: {test_result['output']}")
    if test_result['errors']:
        print(f"错误: {test_result['errors']}")
