#!/usr/bin/env python3
"""
主页数据加载详细测试

测试主页的所有功能，包括：
1. 统计卡片数据加载
2. 最近任务数据加载
3. 系统概览数据
4. 硬编码数据检查

作者: XieHe Medical System
创建时间: 2025-09-29
"""

import requests
import json
from datetime import datetime
from typing import Dict, List, Any

class HomepageTester:
    def __init__(self):
        self.frontend_url = "http://localhost:3000"
        self.backend_url = "http://localhost:8000"
        self.access_token = None
        
    def log(self, message: str, level: str = "INFO"):
        """记录测试日志"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def login(self) -> bool:
        """登录获取访问令牌"""
        try:
            self.log("开始登录...")
            response = requests.post(
                f"{self.backend_url}/api/v1/auth/login",
                json={
                    "username": "admin",
                    "password": "secret",
                    "remember_me": False
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.access_token = data.get("access_token")
                self.log("✅ 登录成功")
                return True
            else:
                self.log(f"❌ 登录失败: {response.status_code}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ 登录异常: {str(e)}", "ERROR")
            return False
    
    def test_homepage_access(self):
        """测试主页访问"""
        self.log("=" * 50)
        self.log("测试主页访问")
        self.log("=" * 50)
        
        try:
            # 测试主页
            self.log("测试主页...")
            response = requests.get(f"{self.frontend_url}/", timeout=10)
            self.log(f"主页状态码: {response.status_code}")
            
            if response.status_code == 200:
                self.log("✅ 主页可以访问")
                
                # 检查页面内容
                content = response.text
                if "系统概览" in content or "总患者数" in content:
                    self.log("✅ 页面包含系统概览功能")
                else:
                    self.log("⚠️ 页面可能缺少系统概览功能", "WARNING")
                
                if "最近任务" in content or "待处理" in content:
                    self.log("✅ 页面包含最近任务功能")
                else:
                    self.log("⚠️ 页面可能缺少最近任务功能", "WARNING")
                    
            else:
                self.log(f"❌ 主页访问失败: {response.status_code}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 主页测试异常: {str(e)}", "ERROR")
    
    def test_dashboard_stats_api(self):
        """测试仪表板统计API"""
        self.log("=" * 50)
        self.log("测试仪表板统计API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 测试仪表板统计API
        try:
            self.log("测试仪表板统计API...")
            response = requests.get(
                f"{self.backend_url}/api/v1/dashboard/stats",
                headers=headers,
                timeout=10
            )
            
            self.log(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ 仪表板统计API正常")
                self.log(f"数据字段: {list(data.keys())}")
                
                # 检查必要字段
                required_fields = ["total_patients", "total_images", "total_reports"]
                missing_fields = [field for field in required_fields if field not in data]
                if missing_fields:
                    self.log(f"⚠️ 缺少字段: {missing_fields}", "WARNING")
                else:
                    self.log("✅ 所有必要字段都存在")
                    
                # 显示统计数据
                for field in required_fields:
                    if field in data:
                        self.log(f"  {field}: {data[field]}")
                        
                # 检查数据合理性
                if data.get("total_patients", 0) > 0:
                    self.log("✅ 患者数据正常")
                else:
                    self.log("⚠️ 患者数据为0，可能需要添加测试数据", "WARNING")
                    
                if data.get("total_images", 0) > 0:
                    self.log("✅ 影像数据正常")
                else:
                    self.log("⚠️ 影像数据为0，可能需要添加测试数据", "WARNING")
                    
            else:
                self.log(f"❌ 仪表板统计API错误: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 仪表板统计API异常: {str(e)}", "ERROR")
    
    def test_recent_tasks_api(self):
        """测试最近任务API"""
        self.log("=" * 50)
        self.log("测试最近任务API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 测试最近任务API
        try:
            self.log("测试最近任务API...")
            response = requests.get(
                f"{self.backend_url}/api/v1/studies/?status=pending&page=1&page_size=5",
                headers=headers,
                timeout=10
            )
            
            self.log(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ 最近任务API正常")
                self.log(f"数据字段: {list(data.keys())}")
                
                if 'studies' in data:
                    studies = data['studies']
                    self.log(f"任务数量: {len(studies)}")
                    
                    if studies:
                        study = studies[0]
                        self.log(f"示例任务字段: {list(study.keys())}")
                        self.log(f"示例任务: {study.get('study_description', 'N/A')} (患者: {study.get('patient_name', 'N/A')})")
                        
                        # 检查任务数据完整性
                        required_task_fields = ["id", "patient_name", "study_description", "status"]
                        missing_task_fields = [field for field in required_task_fields if field not in study]
                        if missing_task_fields:
                            self.log(f"⚠️ 任务缺少字段: {missing_task_fields}", "WARNING")
                        else:
                            self.log("✅ 任务数据完整")
                    else:
                        self.log("⚠️ 没有待处理任务", "WARNING")
                else:
                    self.log("❌ 响应中缺少studies字段", "ERROR")
            else:
                self.log(f"❌ 最近任务API错误: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 最近任务API异常: {str(e)}", "ERROR")
    
    def test_homepage_data_flow(self):
        """测试主页数据流"""
        self.log("=" * 50)
        self.log("测试主页数据流")
        self.log("=" * 50)
        
        # 测试前端API调用路径
        frontend_api_paths = [
            "/api/dashboard/stats",
            "/api/v1/dashboard/stats",
            "/api/studies",
            "/api/v1/studies"
        ]
        
        for path in frontend_api_paths:
            self.log(f"测试前端API路径: {path}")
            try:
                # 测试无认证访问
                response = requests.get(f"{self.frontend_url}{path}", timeout=5)
                self.log(f"  无认证访问: {response.status_code}")
                
                # 测试有认证访问
                if self.access_token:
                    headers = {"Authorization": f"Bearer {self.access_token}"}
                    response = requests.get(f"{self.frontend_url}{path}", headers=headers, timeout=5)
                    self.log(f"  有认证访问: {response.status_code}")
                    
                    if response.status_code == 200:
                        try:
                            data = response.json()
                            self.log(f"  ✅ 成功获取数据: {list(data.keys())}")
                        except:
                            self.log(f"  ⚠️ 响应不是JSON格式", "WARNING")
                
            except Exception as e:
                self.log(f"  ❌ 请求异常: {str(e)}", "ERROR")
    
    def test_homepage_components(self):
        """测试主页组件功能"""
        self.log("=" * 50)
        self.log("测试主页组件功能")
        self.log("=" * 50)
        
        # 测试主页可能使用的API
        apis_to_test = [
            {
                "name": "仪表板统计",
                "url": "/api/v1/dashboard/stats",
                "description": "主页统计卡片数据"
            },
            {
                "name": "待处理任务",
                "url": "/api/v1/studies/?status=pending&page=1&page_size=5",
                "description": "最近任务列表"
            },
            {
                "name": "患者统计",
                "url": "/api/v1/patients/?page=1&page_size=1",
                "description": "患者数量统计"
            }
        ]
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过组件测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        for api in apis_to_test:
            try:
                self.log(f"测试 {api['name']} ({api['description']})...")
                response = requests.get(
                    f"{self.backend_url}{api['url']}",
                    headers=headers,
                    timeout=10
                )
                
                self.log(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"  ✅ {api['name']} API正常")
                    
                    # 根据API类型检查数据
                    if "stats" in api['url']:
                        # 统计数据
                        stats_fields = ["total_patients", "total_images", "total_reports"]
                        for field in stats_fields:
                            if field in data:
                                self.log(f"    {field}: {data[field]}")
                    elif "studies" in api['url']:
                        # 任务数据
                        if 'studies' in data:
                            self.log(f"    任务数量: {len(data['studies'])}")
                    elif "patients" in api['url']:
                        # 患者数据
                        if 'total' in data:
                            self.log(f"    总患者数: {data['total']}")
                            
                else:
                    self.log(f"  ❌ {api['name']} API错误: {response.status_code}", "ERROR")
                    
            except Exception as e:
                self.log(f"  ❌ {api['name']} API异常: {str(e)}", "ERROR")
    
    def run_comprehensive_homepage_test(self):
        """运行主页全面测试"""
        self.log("=" * 60)
        self.log("开始主页数据加载全面测试")
        self.log("=" * 60)
        
        # 1. 登录
        if not self.login():
            self.log("❌ 登录失败，无法继续测试", "ERROR")
            return
        
        # 2. 测试主页访问
        self.test_homepage_access()
        
        # 3. 测试仪表板统计API
        self.test_dashboard_stats_api()
        
        # 4. 测试最近任务API
        self.test_recent_tasks_api()
        
        # 5. 测试主页数据流
        self.test_homepage_data_flow()
        
        # 6. 测试主页组件
        self.test_homepage_components()
        
        self.log("=" * 60)
        self.log("主页数据加载测试完成")
        self.log("=" * 60)

if __name__ == "__main__":
    tester = HomepageTester()
    tester.run_comprehensive_homepage_test()
