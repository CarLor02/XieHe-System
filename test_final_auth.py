#!/usr/bin/env python3
"""
最终认证功能测试脚本
测试登录和注册功能是否完全正常工作
"""

import requests
import json
import sys

def test_backend_auth():
    """测试后端认证功能"""
    print("🔍 测试后端认证功能...")
    
    base_url = "http://localhost:8000"
    
    # 测试admin登录
    print("1. 测试admin登录...")
    login_data = {
        "username": "admin",
        "password": "secret",
        "remember_me": False
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ admin登录成功: {data['user']['username']} ({data['user']['full_name']})")
            admin_token = data['access_token']
        else:
            print(f"   ❌ admin登录失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ admin登录异常: {e}")
        return False
    
    # 测试新用户注册
    print("2. 测试新用户注册...")
    register_data = {
        "username": "finaltest",
        "email": "finaltest@example.com",
        "password": "test123456",
        "confirm_password": "test123456",
        "full_name": "最终测试用户",
        "phone": "13800138999"
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/auth/register", json=register_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 注册成功: {data['user']['username']} ({data['user']['full_name']})")
        else:
            print(f"   ❌ 注册失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ 注册异常: {e}")
        return False
    
    # 测试新用户登录
    print("3. 测试新用户登录...")
    new_login_data = {
        "username": "finaltest",
        "password": "test123456",
        "remember_me": False
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/auth/login", json=new_login_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 新用户登录成功: {data['user']['username']} ({data['user']['full_name']})")
            new_token = data['access_token']
        else:
            print(f"   ❌ 新用户登录失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ 新用户登录异常: {e}")
        return False
    
    # 测试认证后的API调用
    print("4. 测试认证后的API调用...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    try:
        # 测试患者API
        response = requests.get(f"{base_url}/api/v1/patients/?page=1&page_size=5", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 患者API成功: 找到 {data.get('total', 0)} 个患者")
        else:
            print(f"   ❌ 患者API失败: {response.status_code}")
            return False
            
        # 测试仪表板API
        response = requests.get(f"{base_url}/api/v1/dashboard/stats")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 仪表板API成功: {data.get('total_patients', 0)} 患者, {data.get('total_images', 0)} 影像")
        else:
            print(f"   ❌ 仪表板API失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ API调用异常: {e}")
        return False
    
    return True

def test_frontend_proxy():
    """测试前端API代理"""
    print("\n🔍 测试前端API代理...")
    
    base_url = "http://localhost:3000"
    
    # 测试前端登录代理
    print("1. 测试前端登录代理...")
    login_data = {
        "username": "admin",
        "password": "secret",
        "remember_me": False
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 前端登录代理成功: {data['user']['username']}")
        else:
            print(f"   ❌ 前端登录代理失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ 前端登录代理异常: {e}")
        return False
    
    # 测试前端注册代理
    print("2. 测试前端注册代理...")
    register_data = {
        "username": "frontendtest",
        "email": "frontendtest@example.com",
        "password": "test123456",
        "confirm_password": "test123456",
        "full_name": "前端测试用户",
        "phone": "13800138888"
    }
    
    try:
        response = requests.post(f"{base_url}/api/v1/auth/register", json=register_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 前端注册代理成功: {data['user']['username']}")
        else:
            print(f"   ❌ 前端注册代理失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ 前端注册代理异常: {e}")
        return False
    
    return True

def test_frontend_pages():
    """测试前端页面访问"""
    print("\n🔍 测试前端页面访问...")
    
    base_url = "http://localhost:3000"
    pages = [
        ("/", "主页"),
        ("/auth/login", "登录页"),
        ("/dashboard", "仪表板"),
        ("/patients", "患者管理"),
        ("/imaging", "影像中心"),
        ("/upload", "文件上传"),
        ("/reports", "报告管理")
    ]
    
    for path, name in pages:
        try:
            response = requests.get(f"{base_url}{path}")
            if response.status_code == 200:
                print(f"   ✅ {name}: 200 OK")
            else:
                print(f"   ❌ {name}: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ {name}访问异常: {e}")
            return False
    
    return True

def main():
    """主测试函数"""
    print("🚀 开始最终认证功能测试...\n")
    
    # 测试后端认证
    if not test_backend_auth():
        print("\n❌ 后端认证测试失败")
        sys.exit(1)
    
    # 测试前端代理
    if not test_frontend_proxy():
        print("\n❌ 前端代理测试失败")
        sys.exit(1)
    
    # 测试前端页面
    if not test_frontend_pages():
        print("\n❌ 前端页面测试失败")
        sys.exit(1)
    
    print("\n🎉 所有认证功能测试通过！")
    print("\n📋 测试总结:")
    print("  ✅ 后端登录功能正常")
    print("  ✅ 后端注册功能正常")
    print("  ✅ 前端API代理正常")
    print("  ✅ 所有页面访问正常")
    print("  ✅ JWT认证完全修复")
    print("\n🔑 登录信息:")
    print("  管理员: admin / secret")
    print("  前端地址: http://localhost:3000")
    print("  后端地址: http://localhost:8000")

if __name__ == "__main__":
    main()
