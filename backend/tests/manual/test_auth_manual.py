#!/usr/bin/env python3
"""
手动认证测试工具

用于手动测试登录、注册等认证功能
需要后端服务运行在 http://localhost:8000

使用方法:
    python tests/manual/test_auth_manual.py

@author XieHe Medical System
@created 2025-10-14
"""

import requests
import time
import sys
from typing import Dict, Any


class Colors:
    """终端颜色"""
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'
    BOLD = '\033[1m'


class AuthManualTester:
    """认证手动测试器"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.login_url = f"{base_url}/api/v1/auth/login"
        self.register_url = f"{base_url}/api/v1/auth/register"
        
    def print_header(self, title: str):
        """打印标题"""
        print("\n" + "=" * 60)
        print(f"{Colors.BOLD}{title}{Colors.END}")
        print("=" * 60)
        
    def print_success(self, message: str):
        """打印成功消息"""
        print(f"{Colors.GREEN}✅ {message}{Colors.END}")
        
    def print_error(self, message: str):
        """打印错误消息"""
        print(f"{Colors.RED}❌ {message}{Colors.END}")
        
    def print_info(self, message: str):
        """打印信息"""
        print(f"{Colors.BLUE}ℹ️  {message}{Colors.END}")
        
    def test_login(self, username: str, password: str) -> bool:
        """测试登录"""
        print(f"\n{Colors.YELLOW}测试账号:{Colors.END} {username}")
        print(f"{Colors.YELLOW}密码:{Colors.END} {password}")
        
        try:
            response = requests.post(
                self.login_url,
                json={
                    "username": username,
                    "password": password,
                    "remember_me": False
                },
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.print_success("登录成功!")
                
                # 显示令牌
                access_token = data.get('access_token', '')
                if access_token:
                    print(f"  访问令牌: {access_token[:50]}...")
                
                # 显示用户信息
                user = data.get('user', {})
                if user:
                    print(f"  用户信息:")
                    print(f"    ID: {user.get('id')}")
                    print(f"    用户名: {user.get('username')}")
                    print(f"    邮箱: {user.get('email')}")
                    print(f"    姓名: {user.get('full_name')}")
                    print(f"    角色: {user.get('roles')}")
                
                return True
            else:
                self.print_error("登录失败!")
                print(f"  响应: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            self.print_error("连接失败! 请确保后端服务正在运行")
            return False
        except Exception as e:
            self.print_error(f"请求失败: {e}")
            return False
    
    def test_register(self, user_data: Dict[str, Any]) -> bool:
        """测试注册"""
        print(f"\n{Colors.YELLOW}注册数据:{Colors.END}")
        print(f"  用户名: {user_data['username']}")
        print(f"  邮箱: {user_data['email']}")
        print(f"  密码: {user_data['password']}")
        print(f"  姓名: {user_data['full_name']}")
        if 'phone' in user_data:
            print(f"  手机: {user_data['phone']}")
        
        try:
            response = requests.post(
                self.register_url,
                json=user_data,
                headers={"Content-Type": "application/json"},
                timeout=10
            )
            
            print(f"\n状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.print_success("注册成功!")
                print(f"  消息: {data.get('message')}")
                
                user = data.get('user', {})
                if user:
                    print(f"  用户信息:")
                    print(f"    ID: {user.get('id')}")
                    print(f"    用户名: {user.get('username')}")
                    print(f"    邮箱: {user.get('email')}")
                    print(f"    姓名: {user.get('full_name')}")
                
                return True
            else:
                self.print_error("注册失败!")
                print(f"  响应: {response.text}")
                return False
                
        except requests.exceptions.ConnectionError:
            self.print_error("连接失败! 请确保后端服务正在运行")
            return False
        except Exception as e:
            self.print_error(f"请求失败: {e}")
            return False
    
    def test_full_flow(self) -> bool:
        """测试完整的注册+登录流程"""
        self.print_header("测试完整的注册+登录流程")
        
        # 生成唯一用户名
        timestamp = int(time.time())
        new_user = {
            "username": f"testuser{timestamp}",
            "email": f"testuser{timestamp}@test.com",
            "password": "test123456",
            "confirm_password": "test123456",
            "full_name": "测试用户",
            "phone": "13900139000"
        }
        
        # 步骤1: 注册
        print(f"\n{Colors.BOLD}【步骤1】注册新用户{Colors.END}")
        if not self.test_register(new_user):
            return False
        
        # 步骤2: 登录
        print(f"\n{Colors.BOLD}【步骤2】使用新账号登录{Colors.END}")
        if not self.test_login(new_user['username'], new_user['password']):
            return False
        
        self.print_success("完整流程测试成功!")
        return True
    
    def run_all_tests(self):
        """运行所有测试"""
        self.print_header("认证功能手动测试")
        
        # 测试预定义账号登录
        self.print_header("测试登录功能")
        
        test_accounts = [
            {"username": "admin", "password": "admin123"},
            {"username": "admin@xiehe.com", "password": "admin123"},
            {"username": "doctor01", "password": "doctor123"},
        ]
        
        success_count = 0
        for account in test_accounts:
            if self.test_login(account['username'], account['password']):
                success_count += 1
            print("-" * 60)
        
        print(f"\n登录测试结果: {success_count}/{len(test_accounts)} 成功")
        
        # 测试完整流程
        print("\n")
        self.test_full_flow()
        
        # 总结
        self.print_header("测试完成")
        self.print_info("所有手动测试已完成")


def main():
    """主函数"""
    tester = AuthManualTester()
    
    # 检查命令行参数
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "login":
            # 测试登录
            tester.print_header("测试登录功能")
            tester.test_login("admin", "admin123")
            
        elif command == "register":
            # 测试注册
            tester.print_header("测试注册功能")
            timestamp = int(time.time())
            user_data = {
                "username": f"testuser{timestamp}",
                "email": f"testuser{timestamp}@test.com",
                "password": "test123456",
                "confirm_password": "test123456",
                "full_name": "测试用户",
                "phone": "13800138000"
            }
            tester.test_register(user_data)
            
        elif command == "full":
            # 测试完整流程
            tester.test_full_flow()
            
        else:
            print(f"未知命令: {command}")
            print("可用命令: login, register, full")
    else:
        # 运行所有测试
        tester.run_all_tests()


if __name__ == "__main__":
    main()

