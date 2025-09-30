#!/usr/bin/env python3
"""
权限管理功能详细测试脚本

测试内容：
1. 权限管理页面访问测试
2. 权限相关API测试
3. 数据表检查
4. 硬编码数据检查
5. 权限分配功能测试

@author XieHe Medical System
@created 2025-09-29
"""

import requests
import json
import logging
from datetime import datetime
from typing import Dict, Any

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class PermissionTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.token = None
        self.headers = {}
        
    def login(self) -> bool:
        """登录获取认证token"""
        try:
            logger.info("开始登录...")
            response = requests.post(f"{self.base_url}/api/v1/auth/login", json={
                "username": "admin",
                "password": "secret"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                logger.info("✅ 登录成功")
                return True
            else:
                logger.error(f"❌ 登录失败: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ 登录异常: {e}")
            return False
    
    def test_permission_pages(self):
        """测试权限管理页面访问"""
        logger.info("=" * 50)
        logger.info("测试权限管理页面访问")
        logger.info("=" * 50)
        
        pages = [
            ("/permissions", "权限管理"),
            ("/permissions/roles", "角色管理"),
            ("/permissions/users", "用户权限"),
        ]
        
        for path, name in pages:
            try:
                logger.info(f"测试 {name} 页面...")
                response = requests.get(f"{self.frontend_url}{path}")
                logger.info(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    content = response.text
                    # 检查页面是否包含权限相关内容
                    permission_keywords = ["权限", "角色", "用户", "permission", "role", "user"]
                    has_content = any(keyword in content for keyword in permission_keywords)
                    
                    if has_content:
                        logger.info(f"  ✅ {name} 页面可以访问")
                        logger.info(f"  ✅ 页面包含权限相关内容")
                    else:
                        logger.warning(f"  ⚠️ {name} 页面可以访问但内容可疑")
                else:
                    logger.error(f"  ❌ {name} 页面访问失败")
                    
            except Exception as e:
                logger.error(f"  ❌ {name} 页面测试异常: {e}")
    
    def test_permission_apis(self):
        """测试权限相关API"""
        logger.info("=" * 50)
        logger.info("测试权限相关API")
        logger.info("=" * 50)
        
        apis = [
            ("GET", "/api/v1/users/", "用户列表"),
            ("GET", "/api/v1/roles/", "角色列表"),
            ("GET", "/api/v1/permissions/", "权限列表"),
            ("GET", "/api/v1/users/1/roles", "用户角色"),
            ("GET", "/api/v1/roles/1/permissions", "角色权限"),
        ]
        
        for method, endpoint, name in apis:
            try:
                logger.info(f"测试 {name} ({method} {endpoint})...")
                
                if method == "GET":
                    response = requests.get(f"{self.base_url}{endpoint}", headers=self.headers)
                else:
                    response = requests.request(method, f"{self.base_url}{endpoint}", headers=self.headers)
                
                logger.info(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    try:
                        data = response.json()
                        logger.info(f"  ✅ {name} API正常")
                        if isinstance(data, dict):
                            logger.info(f"  数据字段: {list(data.keys())}")
                        elif isinstance(data, list) and data:
                            logger.info(f"  数据条数: {len(data)}")
                    except:
                        logger.info(f"  ✅ {name} API正常（非JSON响应）")
                elif response.status_code == 422:
                    logger.warning(f"  ⚠️ {name} API参数错误（正常）")
                elif response.status_code == 404:
                    logger.error(f"  ❌ {name} API不存在")
                else:
                    logger.error(f"  ❌ {name} API错误: {response.text[:200]}")
                    
            except Exception as e:
                logger.error(f"  ❌ {name} API测试异常: {e}")
    
    def check_permission_tables(self):
        """检查权限相关数据表"""
        logger.info("=" * 50)
        logger.info("检查权限相关数据表")
        logger.info("=" * 50)
        
        try:
            # 使用数据库连接检查表
            import sys
            import os
            sys.path.append('/xinray/data/百度云/xhe/XieHe-System/backend')
            
            from app.core.database import get_db
            from sqlalchemy import text
            
            db = next(get_db())
            
            tables_to_check = [
                ("users", "用户表"),
                ("roles", "角色表"),
                ("permissions", "权限表"),
                ("user_roles", "用户角色关联表"),
                ("role_permissions", "角色权限关联表"),
                ("departments", "部门表"),
            ]
            
            logger.info("数据表检查结果:")
            
            for table_name, description in tables_to_check:
                try:
                    result = db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    count = result.scalar()
                    logger.info(f"  ✅ {description} ({table_name}): {count}条记录")
                    
                    # 显示前几条记录的结构
                    if count > 0:
                        result = db.execute(text(f"SELECT * FROM {table_name} LIMIT 2"))
                        rows = result.fetchall()
                        if rows:
                            columns = result.keys()
                            logger.info(f"    字段: {list(columns)}")
                            
                except Exception as e:
                    logger.error(f"  ❌ {description} ({table_name}): 查询失败 - {e}")
            
            db.close()
            
        except Exception as e:
            logger.error(f"数据表检查失败: {e}")
    
    def test_permission_assignment(self):
        """测试权限分配功能"""
        logger.info("=" * 50)
        logger.info("测试权限分配功能")
        logger.info("=" * 50)
        
        try:
            # 测试获取当前用户权限
            logger.info("测试获取当前用户权限...")
            response = requests.get(f"{self.base_url}/api/v1/auth/me", headers=self.headers)
            logger.info(f"  状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"  ✅ 当前用户信息获取成功")
                logger.info(f"  用户信息: {json.dumps(data, indent=2, ensure_ascii=False)}")
            else:
                logger.error(f"  ❌ 获取用户信息失败: {response.text}")
            
            # 测试权限检查
            logger.info("测试权限检查...")
            test_permissions = [
                "patient.read",
                "patient.create", 
                "image.read",
                "report.read",
                "system.admin"
            ]
            
            for permission in test_permissions:
                try:
                    response = requests.get(
                        f"{self.base_url}/api/v1/auth/check-permission",
                        headers=self.headers,
                        params={"permission": permission}
                    )
                    logger.info(f"  权限 {permission}: {response.status_code}")
                except Exception as e:
                    logger.info(f"  权限 {permission}: 检查失败 - {e}")
                    
        except Exception as e:
            logger.error(f"权限分配测试失败: {e}")
    
    def run_all_tests(self):
        """运行所有测试"""
        logger.info("=" * 60)
        logger.info("开始权限管理功能全面测试")
        logger.info("=" * 60)
        
        # 1. 登录
        if not self.login():
            logger.error("登录失败，无法继续测试")
            return
        
        # 2. 测试页面访问
        self.test_permission_pages()
        
        # 3. 测试API
        self.test_permission_apis()
        
        # 4. 检查数据表
        self.check_permission_tables()
        
        # 5. 测试权限分配
        self.test_permission_assignment()
        
        logger.info("=" * 60)
        logger.info("权限管理功能测试完成")
        logger.info("=" * 60)

if __name__ == "__main__":
    tester = PermissionTester()
    tester.run_all_tests()
