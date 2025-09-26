"""
认证功能测试

测试用户认证相关功能，包括登录、注册、权限验证等

@author XieHe Medical System
@created 2025-09-24
"""

import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.core.database import get_db
from app.core.security import security_manager, hash_password, verify_password
from app.core.cache import get_cache_manager

# 创建测试客户端
client = TestClient(app)

# 测试数据
TEST_USER_DATA = {
    "username": "testuser",
    "email": "test@example.com",
    "password": "test123456",
    "confirm_password": "test123456",
    "full_name": "测试用户",
    "phone": "13800138000"
}

ADMIN_USER_DATA = {
    "username": "admin",
    "password": "admin123"
}

class TestPasswordSecurity:
    """密码安全测试"""
    
    def test_password_hashing(self):
        """测试密码加密"""
        password = "test123456"
        hashed = hash_password(password)
        
        # 验证密码被正确加密
        assert hashed != password
        assert len(hashed) > 50  # bcrypt哈希长度
        assert hashed.startswith('$2b$')
        
    def test_password_verification(self):
        """测试密码验证"""
        password = "test123456"
        hashed = hash_password(password)
        
        # 正确密码验证
        assert verify_password(password, hashed) is True
        
        # 错误密码验证
        assert verify_password("wrongpassword", hashed) is False
        
    def test_password_uniqueness(self):
        """测试密码加密唯一性"""
        password = "test123456"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        
        # 相同密码的哈希值应该不同（因为salt）
        assert hash1 != hash2
        
        # 但都能验证成功
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


class TestJWTTokens:
    """JWT令牌测试"""
    
    def test_access_token_creation(self):
        """测试访问令牌创建"""
        user_data = {
            "user_id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "roles": ["user"],
            "permissions": ["read"],
            "is_active": True,
            "is_superuser": False
        }
        
        token = security_manager.create_access_token(user_data)
        
        # 验证令牌格式
        assert isinstance(token, str)
        assert len(token.split('.')) == 3  # JWT格式：header.payload.signature
        
    def test_refresh_token_creation(self):
        """测试刷新令牌创建"""
        user_data = {
            "user_id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "roles": ["user"],
            "permissions": ["read"],
            "is_active": True,
            "is_superuser": False
        }
        
        token = security_manager.create_refresh_token(user_data)
        
        # 验证令牌格式
        assert isinstance(token, str)
        assert len(token.split('.')) == 3
        
    def test_token_verification(self):
        """测试令牌验证"""
        user_data = {
            "user_id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "roles": ["user"],
            "permissions": ["read"],
            "is_active": True,
            "is_superuser": False
        }
        
        # 创建令牌
        access_token = security_manager.create_access_token(user_data)
        refresh_token = security_manager.create_refresh_token(user_data)
        
        # 验证访问令牌
        access_payload = security_manager.verify_token(access_token)
        assert access_payload is not None
        assert access_payload["username"] == "testuser"
        assert access_payload["type"] == "access"
        
        # 验证刷新令牌
        refresh_payload = security_manager.verify_token(refresh_token)
        assert refresh_payload is not None
        assert refresh_payload["username"] == "testuser"
        assert refresh_payload["type"] == "refresh"
        
    def test_invalid_token_verification(self):
        """测试无效令牌验证"""
        # 测试无效令牌
        invalid_token = "invalid.token.here"
        payload = security_manager.verify_token(invalid_token)
        assert payload is None
        
        # 测试空令牌
        payload = security_manager.verify_token("")
        assert payload is None
        
        # 测试None令牌
        payload = security_manager.verify_token(None)
        assert payload is None


class TestAuthAPI:
    """认证API测试"""
    
    def test_login_success(self):
        """测试登录成功"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "admin123",
                "remember_me": True
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # 验证响应结构
        assert "message" in data
        assert "tokens" in data
        assert "user" in data
        
        # 验证令牌
        tokens = data["tokens"]
        assert "access_token" in tokens
        assert "refresh_token" in tokens
        assert "token_type" in tokens
        assert "expires_in" in tokens
        assert tokens["token_type"] == "bearer"
        
        # 验证用户信息
        user = data["user"]
        assert user["username"] == "admin"
        assert user["is_active"] is True
        assert "roles" in user
        
    def test_login_invalid_credentials(self):
        """测试登录失败 - 无效凭据"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
        
    def test_login_missing_fields(self):
        """测试登录失败 - 缺少字段"""
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username": "admin"
                # 缺少password字段
            }
        )
        
        assert response.status_code == 422  # Validation error
        
    def test_register_success(self):
        """测试注册成功"""
        response = client.post(
            "/api/v1/auth/register",
            json=TEST_USER_DATA
        )
        
        # 注册成功或用户已存在都是可接受的
        assert response.status_code in [200, 400]
        
        if response.status_code == 200:
            data = response.json()
            assert "message" in data
            assert "user" in data
            
            user = data["user"]
            assert user["username"] == TEST_USER_DATA["username"]
            assert user["email"] == TEST_USER_DATA["email"]
            assert user["full_name"] == TEST_USER_DATA["full_name"]
            
    def test_register_password_mismatch(self):
        """测试注册失败 - 密码不匹配"""
        invalid_data = TEST_USER_DATA.copy()
        invalid_data["confirm_password"] = "differentpassword"
        
        response = client.post(
            "/api/v1/auth/register",
            json=invalid_data
        )
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        
    def test_get_current_user_without_token(self):
        """测试获取当前用户 - 无令牌"""
        response = client.get("/api/v1/auth/me")
        
        assert response.status_code == 401
        
    def test_get_current_user_with_valid_token(self):
        """测试获取当前用户 - 有效令牌"""
        # 先登录获取令牌
        login_response = client.post(
            "/api/v1/auth/login",
            json=ADMIN_USER_DATA
        )
        
        assert login_response.status_code == 200
        tokens = login_response.json()["tokens"]
        access_token = tokens["access_token"]
        
        # 使用令牌获取用户信息
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "user" in data
        user = data["user"]
        assert user["username"] == "admin"
        assert user["is_active"] is True
        
    def test_refresh_token_success(self):
        """测试令牌刷新成功"""
        # 先登录获取令牌
        login_response = client.post(
            "/api/v1/auth/login",
            json=ADMIN_USER_DATA
        )
        
        assert login_response.status_code == 200
        tokens = login_response.json()["tokens"]
        refresh_token = tokens["refresh_token"]
        
        # 刷新令牌
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "tokens" in data
        
        new_tokens = data["tokens"]
        assert "access_token" in new_tokens
        assert "refresh_token" in new_tokens
        
        # 新令牌应该与旧令牌不同
        assert new_tokens["access_token"] != tokens["access_token"]
        
    def test_refresh_token_invalid(self):
        """测试令牌刷新失败 - 无效令牌"""
        response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid.refresh.token"}
        )
        
        assert response.status_code == 401
        
    def test_logout_success(self):
        """测试登出成功"""
        # 先登录获取令牌
        login_response = client.post(
            "/api/v1/auth/login",
            json=ADMIN_USER_DATA
        )
        
        assert login_response.status_code == 200
        tokens = login_response.json()["tokens"]
        access_token = tokens["access_token"]
        
        # 登出
        response = client.post(
            "/api/v1/auth/logout",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestTokenBlacklist:
    """令牌黑名单测试"""
    
    def test_token_blacklist_functionality(self):
        """测试令牌黑名单功能"""
        # 创建测试令牌
        user_data = {
            "user_id": 1,
            "username": "testuser",
            "email": "test@example.com",
            "roles": ["user"],
            "permissions": ["read"],
            "is_active": True,
            "is_superuser": False
        }
        
        token = security_manager.create_access_token(user_data)
        
        # 验证令牌有效
        payload = security_manager.verify_token(token)
        assert payload is not None
        
        # 将令牌加入黑名单
        security_manager.blacklist_token(token)
        
        # 验证令牌已被黑名单
        assert security_manager.is_token_blacklisted(token) is True
        
        # 验证黑名单令牌无法通过验证
        payload = security_manager.verify_token(token)
        assert payload is None


class TestAPIKeySecurity:
    """API密钥安全测试"""
    
    def test_api_key_generation(self):
        """测试API密钥生成"""
        api_key = security_manager.generate_api_key("test_user", "test_purpose")
        
        assert isinstance(api_key, str)
        assert len(api_key) > 20  # API密钥应该足够长
        
    def test_api_key_verification(self):
        """测试API密钥验证"""
        user_id = "test_user"
        purpose = "test_purpose"
        
        # 生成API密钥
        api_key = security_manager.generate_api_key(user_id, purpose)
        
        # 验证API密钥
        key_info = security_manager.verify_api_key(api_key)
        
        assert key_info is not None
        assert key_info["user_id"] == user_id
        assert key_info["name"] == purpose
        
    def test_invalid_api_key_verification(self):
        """测试无效API密钥验证"""
        # 测试无效API密钥
        key_info = security_manager.verify_api_key("invalid_api_key")
        assert key_info is None
        
        # 测试空API密钥
        key_info = security_manager.verify_api_key("")
        assert key_info is None


if __name__ == "__main__":
    # 运行测试
    pytest.main([__file__, "-v"])
