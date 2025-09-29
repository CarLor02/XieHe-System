#!/usr/bin/env python3
"""
测试认证功能的脚本
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.security import SecurityManager
from app.core.database import get_db
from app.models.user import User
from sqlalchemy import text

def test_auth():
    """测试认证功能"""
    
    # 创建安全管理器
    security_manager = SecurityManager()
    
    # 获取数据库连接
    db = next(get_db())
    
    try:
        # 查找管理员用户
        result = db.execute(text("SELECT id, username, email FROM users WHERE username = 'admin'"))
        user_row = result.fetchone()
        
        if not user_row:
            print("❌ 未找到管理员用户")
            return
            
        user_id, username, email = user_row
        print(f"✅ 找到用户: {username} ({email})")
        
        # 生成访问令牌
        token_data = {
            "sub": str(user_id),
            "username": username,
            "email": email,
            "user_type": "admin"
        }
        
        access_token = security_manager.create_access_token(token_data)
        print(f"✅ 生成访问令牌: {access_token[:50]}...")
        
        # 验证令牌
        payload = security_manager.verify_token(access_token, "access")
        if payload:
            print(f"✅ 令牌验证成功: {payload}")
        else:
            print("❌ 令牌验证失败")
            
        return access_token
        
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    token = test_auth()
    if token:
        print(f"\n🔑 使用此令牌测试API:")
        print(f"curl -H 'Authorization: Bearer {token}' http://localhost:8000/api/v1/patients/")
