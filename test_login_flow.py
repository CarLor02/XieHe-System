#!/usr/bin/env python3
"""
测试登录流程

验证前端和后端的登录功能是否正常工作
"""

import requests
import json

def test_backend_login():
    """测试后端登录API"""
    print("🔍 测试后端登录API...")
    
    url = "http://localhost:8000/api/v1/auth/login"
    data = {
        "username": "admin",
        "password": "secret",
        "remember_me": False
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 后端登录成功: {result['user']['username']} ({result['user']['full_name']})")
            return result['access_token']
        else:
            print(f"❌ 后端登录失败: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ 后端登录异常: {e}")
        return None

def test_frontend_proxy():
    """测试前端API代理"""
    print("🔍 测试前端API代理...")
    
    url = "http://localhost:3000/api/v1/auth/login"
    data = {
        "username": "admin",
        "password": "secret",
        "remember_me": False
    }
    
    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 前端代理成功: {result['user']['username']} ({result['user']['full_name']})")
            return True
        else:
            print(f"❌ 前端代理失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"❌ 前端代理异常: {e}")
        return False

def test_authenticated_api(token):
    """测试认证后的API调用"""
    print("🔍 测试认证后的API调用...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # 测试患者API
    try:
        response = requests.get("http://localhost:8000/api/v1/patients/?page=1&page_size=5", headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 患者API成功: 找到 {result['total']} 个患者")
        else:
            print(f"❌ 患者API失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 患者API异常: {e}")
    
    # 测试影像API
    try:
        response = requests.get("http://localhost:8000/api/v1/images/?page=1&page_size=5", headers=headers)
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 影像API成功: 找到 {result['total']} 个影像")
        else:
            print(f"❌ 影像API失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 影像API异常: {e}")

def test_frontend_pages():
    """测试前端页面访问"""
    print("🔍 测试前端页面访问...")
    
    pages = [
        ("主页", "http://localhost:3000/"),
        ("登录页", "http://localhost:3000/auth/login"),
        ("仪表板", "http://localhost:3000/dashboard"),
        ("患者管理", "http://localhost:3000/patients"),
        ("影像中心", "http://localhost:3000/imaging"),
        ("文件上传", "http://localhost:3000/upload"),
    ]
    
    for name, url in pages:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print(f"✅ {name}: 200 OK")
            else:
                print(f"❌ {name}: {response.status_code}")
        except Exception as e:
            print(f"❌ {name}: 异常 - {e}")

def main():
    print("🚀 开始测试登录流程...\n")
    
    # 1. 测试后端登录
    token = test_backend_login()
    print()
    
    # 2. 测试前端代理
    test_frontend_proxy()
    print()
    
    # 3. 测试认证后的API
    if token:
        test_authenticated_api(token)
        print()
    
    # 4. 测试前端页面
    test_frontend_pages()
    print()
    
    print("🎉 登录流程测试完成！")
    print("\n📋 登录信息:")
    print("  用户名: admin")
    print("  密码: secret")
    print("  前端地址: http://localhost:3000")
    print("  后端地址: http://localhost:8000")

if __name__ == "__main__":
    main()
