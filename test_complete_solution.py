#!/usr/bin/env python3
"""
完整解决方案验证测试
验证所有用户报告的问题都已解决
"""

import requests
import json

def test_login_issue():
    """测试问题1：登录失败"""
    print("🔍 测试问题1：admin登录功能...")
    
    # 测试后端直接登录
    login_data = {
        "username": "admin",
        "password": "secret",
        "remember_me": False
    }
    
    try:
        response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 后端登录成功: {data['user']['username']} ({data['user']['full_name']})")
        else:
            print(f"   ❌ 后端登录失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ 后端登录异常: {e}")
        return False
    
    # 测试前端代理登录
    try:
        response = requests.post("http://localhost:3000/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 前端代理登录成功: {data['user']['username']}")
        else:
            print(f"   ❌ 前端代理登录失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ 前端代理登录异常: {e}")
        return False
    
    return True

def test_register_issue():
    """测试问题2：注册失败"""
    print("\n🔍 测试问题2：用户注册功能...")
    
    register_data = {
        "username": "solutiontest",
        "email": "solutiontest@example.com",
        "password": "test123456",
        "confirm_password": "test123456",
        "full_name": "解决方案测试用户",
        "phone": "13800138555"
    }
    
    # 测试后端注册
    try:
        response = requests.post("http://localhost:8000/api/v1/auth/register", json=register_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 后端注册成功: {data['user']['username']} ({data['user']['full_name']})")
        else:
            print(f"   ❌ 后端注册失败: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print(f"   ❌ 后端注册异常: {e}")
        return False
    
    # 测试新用户登录
    login_data = {
        "username": "solutiontest",
        "password": "test123456",
        "remember_me": False
    }
    
    try:
        response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data)
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 新用户登录成功: {data['user']['username']}")
        else:
            print(f"   ❌ 新用户登录失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ 新用户登录异常: {e}")
        return False
    
    return True

def test_cors_issue():
    """测试问题3：CORS错误"""
    print("\n🔍 测试问题3：CORS跨域问题...")
    
    # 测试CORS预检请求
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    }
    
    try:
        response = requests.options("http://localhost:8000/api/v1/auth/login", headers=headers)
        if response.status_code == 200:
            allow_origin = response.headers.get("Access-Control-Allow-Origin")
            if allow_origin == "http://localhost:3000":
                print("   ✅ CORS预检请求成功")
            else:
                print(f"   ❌ CORS预检请求Origin错误: {allow_origin}")
                return False
        else:
            print(f"   ❌ CORS预检请求失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ CORS预检请求异常: {e}")
        return False
    
    # 测试带Origin的实际请求
    headers = {
        "Origin": "http://localhost:3000",
        "Content-Type": "application/json"
    }
    
    login_data = {
        "username": "admin",
        "password": "secret",
        "remember_me": False
    }
    
    try:
        response = requests.post("http://localhost:8000/api/v1/auth/login", json=login_data, headers=headers)
        if response.status_code == 200:
            allow_origin = response.headers.get("Access-Control-Allow-Origin")
            if allow_origin == "http://localhost:3000":
                print("   ✅ CORS实际请求成功")
            else:
                print(f"   ❌ CORS实际请求Origin错误: {allow_origin}")
                return False
        else:
            print(f"   ❌ CORS实际请求失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ CORS实际请求异常: {e}")
        return False
    
    return True

def test_system_status():
    """测试系统整体状态"""
    print("\n🔍 测试系统整体状态...")
    
    # 测试前端页面
    pages = [
        ("http://localhost:3000/", "主页"),
        ("http://localhost:3000/auth/login", "登录页"),
        ("http://localhost:3000/dashboard", "仪表板"),
        ("http://localhost:3000/patients", "患者管理"),
        ("http://localhost:3000/imaging", "影像中心")
    ]
    
    for url, name in pages:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                print(f"   ✅ {name}: 200 OK")
            else:
                print(f"   ❌ {name}: {response.status_code}")
                return False
        except Exception as e:
            print(f"   ❌ {name}访问异常: {e}")
            return False
    
    # 测试API功能
    try:
        response = requests.get("http://localhost:8000/api/v1/dashboard/stats")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ 仪表板API: {data.get('total_patients', 0)} 患者, {data.get('total_images', 0)} 影像")
        else:
            print(f"   ❌ 仪表板API失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"   ❌ 仪表板API异常: {e}")
        return False
    
    return True

def main():
    """主测试函数"""
    print("🚀 开始完整解决方案验证测试...\n")
    
    success = True
    
    # 测试登录问题
    if not test_login_issue():
        print("❌ 登录问题未解决")
        success = False
    
    # 测试注册问题
    if not test_register_issue():
        print("❌ 注册问题未解决")
        success = False
    
    # 测试CORS问题
    if not test_cors_issue():
        print("❌ CORS问题未解决")
        success = False
    
    # 测试系统状态
    if not test_system_status():
        print("❌ 系统状态异常")
        success = False
    
    if success:
        print("\n🎉 所有问题都已完全解决！")
        print("\n📋 解决方案总结:")
        print("  ✅ 问题1 - 登录失败: 已修复密码哈希")
        print("  ✅ 问题2 - 注册失败: 已修复SQL插入语句")
        print("  ✅ 问题3 - CORS错误: 已修复跨域配置")
        print("  ✅ 系统状态: 所有功能正常")
        print("\n🔑 用户现在可以:")
        print("  • 使用 admin/secret 正常登录")
        print("  • 注册新用户账户")
        print("  • 在浏览器中正常使用系统")
        print("  • 访问所有页面和功能")
        print("\n🌐 访问地址:")
        print("  • 前端: http://localhost:3000")
        print("  • 后端: http://localhost:8000")
    else:
        print("\n❌ 仍有问题未解决，请检查上述错误信息")
    
    return success

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)
