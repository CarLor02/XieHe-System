#!/usr/bin/env python3
"""
CORS修复验证测试脚本
测试前端到后端的跨域请求是否正常工作
"""

import requests
import json

def test_cors_preflight():
    """测试CORS预检请求"""
    print("🔍 测试CORS预检请求...")
    
    # 测试登录API的OPTIONS请求
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type"
    }
    
    try:
        response = requests.options("http://localhost:8000/api/v1/auth/login", headers=headers)
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
                "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
                "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
                "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials")
            }
            
            print("   CORS响应头:")
            for header, value in cors_headers.items():
                print(f"     {header}: {value}")
            
            # 检查关键CORS头
            if cors_headers["Access-Control-Allow-Origin"] == "http://localhost:3000":
                print("   ✅ Access-Control-Allow-Origin 正确")
            else:
                print("   ❌ Access-Control-Allow-Origin 错误")
                return False
                
            if cors_headers["Access-Control-Allow-Credentials"] == "true":
                print("   ✅ Access-Control-Allow-Credentials 正确")
            else:
                print("   ❌ Access-Control-Allow-Credentials 错误")
                return False
                
            return True
        else:
            print(f"   ❌ 预检请求失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ 预检请求异常: {e}")
        return False

def test_cors_actual_request():
    """测试实际的跨域请求"""
    print("\n🔍 测试实际跨域请求...")
    
    # 测试登录请求
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
        response = requests.post(
            "http://localhost:8000/api/v1/auth/login", 
            json=login_data, 
            headers=headers
        )
        
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            # 检查响应中的CORS头
            allow_origin = response.headers.get("Access-Control-Allow-Origin")
            allow_credentials = response.headers.get("Access-Control-Allow-Credentials")
            
            print(f"   Access-Control-Allow-Origin: {allow_origin}")
            print(f"   Access-Control-Allow-Credentials: {allow_credentials}")
            
            if allow_origin == "http://localhost:3000" and allow_credentials == "true":
                print("   ✅ 登录请求CORS头正确")
                
                # 检查响应内容
                data = response.json()
                if "access_token" in data and "user" in data:
                    print(f"   ✅ 登录成功: {data['user']['username']}")
                    return True
                else:
                    print("   ❌ 登录响应格式错误")
                    return False
            else:
                print("   ❌ 登录请求CORS头错误")
                return False
        else:
            print(f"   ❌ 登录请求失败: {response.status_code}")
            print(f"   响应: {response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ 登录请求异常: {e}")
        return False

def test_cors_register():
    """测试注册请求的CORS"""
    print("\n🔍 测试注册请求CORS...")
    
    headers = {
        "Origin": "http://localhost:3000",
        "Content-Type": "application/json"
    }
    
    register_data = {
        "username": "corstest2",
        "email": "corstest2@example.com",
        "password": "password123",
        "confirm_password": "password123",
        "full_name": "CORS测试用户2",
        "phone": "13800138666"
    }
    
    try:
        response = requests.post(
            "http://localhost:8000/api/v1/auth/register", 
            json=register_data, 
            headers=headers
        )
        
        print(f"   状态码: {response.status_code}")
        
        if response.status_code == 200:
            allow_origin = response.headers.get("Access-Control-Allow-Origin")
            print(f"   Access-Control-Allow-Origin: {allow_origin}")
            
            if allow_origin == "http://localhost:3000":
                data = response.json()
                print(f"   ✅ 注册成功: {data['user']['username']}")
                return True
            else:
                print("   ❌ 注册请求CORS头错误")
                return False
        else:
            print(f"   ❌ 注册请求失败: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"   ❌ 注册请求异常: {e}")
        return False

def main():
    """主测试函数"""
    print("🚀 开始CORS修复验证测试...\n")
    
    # 测试预检请求
    if not test_cors_preflight():
        print("\n❌ CORS预检请求测试失败")
        return False
    
    # 测试实际请求
    if not test_cors_actual_request():
        print("\n❌ CORS实际请求测试失败")
        return False
    
    # 测试注册请求
    if not test_cors_register():
        print("\n❌ CORS注册请求测试失败")
        return False
    
    print("\n🎉 CORS修复验证测试全部通过！")
    print("\n📋 测试总结:")
    print("  ✅ CORS预检请求正常")
    print("  ✅ 登录跨域请求正常")
    print("  ✅ 注册跨域请求正常")
    print("  ✅ 所有CORS头正确设置")
    print("\n🌐 前端现在可以正常访问后端API了！")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)
