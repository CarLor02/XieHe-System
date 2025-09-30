#!/usr/bin/env python3
"""
患者管理功能详细测试

测试患者管理的所有功能，包括：
1. 患者列表页面
2. 添加患者功能
3. 编辑患者功能
4. 患者详情页面
5. 数据库操作验证

作者: XieHe Medical System
创建时间: 2025-09-29
"""

import requests
import json
from datetime import datetime, date
from typing import Dict, List, Any
import random
import string

class PatientsTester:
    def __init__(self):
        self.frontend_url = "http://localhost:3000"
        self.backend_url = "http://localhost:8000"
        self.access_token = None
        self.test_patient_id = None
        
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
    
    def test_patients_page_access(self):
        """测试患者管理页面访问"""
        self.log("=" * 50)
        self.log("测试患者管理页面访问")
        self.log("=" * 50)
        
        pages = [
            {"name": "患者列表", "url": "/patients"},
            {"name": "添加患者", "url": "/patients/add"},
        ]
        
        for page in pages:
            try:
                self.log(f"测试 {page['name']} 页面...")
                response = requests.get(f"{self.frontend_url}{page['url']}", timeout=10)
                self.log(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    self.log(f"  ✅ {page['name']} 页面可以访问")
                    
                    # 检查页面内容
                    content = response.text
                    if "患者" in content:
                        self.log(f"  ✅ 页面包含患者相关内容")
                    else:
                        self.log(f"  ⚠️ 页面可能缺少患者相关内容", "WARNING")
                        
                else:
                    self.log(f"  ❌ {page['name']} 页面访问失败: {response.status_code}", "ERROR")
                    
            except Exception as e:
                self.log(f"  ❌ {page['name']} 页面测试异常: {str(e)}", "ERROR")
    
    def test_patients_list_api(self):
        """测试患者列表API"""
        self.log("=" * 50)
        self.log("测试患者列表API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            self.log("测试患者列表API...")
            response = requests.get(
                f"{self.backend_url}/api/v1/patients/?page=1&page_size=10",
                headers=headers,
                timeout=10
            )
            
            self.log(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ 患者列表API正常")
                self.log(f"数据字段: {list(data.keys())}")
                
                if 'patients' in data:
                    patients = data['patients']
                    self.log(f"患者数量: {len(patients)}")
                    self.log(f"总患者数: {data.get('total', 'N/A')}")
                    
                    if patients:
                        patient = patients[0]
                        self.log(f"示例患者字段: {list(patient.keys())}")
                        self.log(f"示例患者: {patient.get('name', 'N/A')} (ID: {patient.get('id', 'N/A')})")
                        
                        # 检查患者数据完整性
                        required_fields = ["id", "name", "gender", "age"]
                        missing_fields = [field for field in required_fields if field not in patient]
                        if missing_fields:
                            self.log(f"⚠️ 患者缺少字段: {missing_fields}", "WARNING")
                        else:
                            self.log("✅ 患者数据完整")
                    else:
                        self.log("⚠️ 没有患者数据", "WARNING")
                else:
                    self.log("❌ 响应中缺少patients字段", "ERROR")
            else:
                self.log(f"❌ 患者列表API错误: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 患者列表API异常: {str(e)}", "ERROR")
    
    def test_add_patient_api(self):
        """测试添加患者API"""
        self.log("=" * 50)
        self.log("测试添加患者API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 生成测试患者数据
        random_suffix = ''.join(random.choices(string.digits, k=4))
        test_patient = {
            "patient_id": f"P{random_suffix}",  # 添加必需的patient_id字段
            "name": f"测试患者{random_suffix}",
            "gender": "male",
            "birth_date": "1990-01-01",
            "phone": f"138{random_suffix}5678",
            "email": f"test{random_suffix}@example.com",
            "address": "测试地址123号",
            "emergency_contact_name": "紧急联系人",
            "emergency_contact_phone": "13800000000",
            "id_card": f"11010119900101{random_suffix}",
            "insurance_number": f"INS{random_suffix}"
        }
        
        try:
            self.log("测试添加患者API...")
            self.log(f"测试患者数据: {test_patient['name']}")
            
            response = requests.post(
                f"{self.backend_url}/api/v1/patients/",
                headers=headers,
                json=test_patient,
                timeout=10
            )
            
            self.log(f"状态码: {response.status_code}")
            
            if response.status_code == 201:
                data = response.json()
                self.log("✅ 添加患者API正常")
                self.log(f"新患者ID: {data.get('id', 'N/A')}")
                self.log(f"新患者姓名: {data.get('name', 'N/A')}")
                
                # 保存测试患者ID用于后续测试
                self.test_patient_id = data.get('id')
                
                # 验证返回的数据
                for key, value in test_patient.items():
                    if key in data and data[key] != value:
                        self.log(f"⚠️ 字段 {key} 值不匹配: 期望 {value}, 实际 {data[key]}", "WARNING")
                
                self.log("✅ 患者添加成功")
                
            else:
                self.log(f"❌ 添加患者API错误: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 添加患者API异常: {str(e)}", "ERROR")
    
    def test_get_patient_detail_api(self):
        """测试获取患者详情API"""
        self.log("=" * 50)
        self.log("测试获取患者详情API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        if not self.test_patient_id:
            self.log("⚠️ 没有测试患者ID，使用现有患者", "WARNING")
            # 获取第一个患者的ID
            try:
                headers = {"Authorization": f"Bearer {self.access_token}"}
                response = requests.get(
                    f"{self.backend_url}/api/v1/patients/?page=1&page_size=1",
                    headers=headers,
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    if data.get('patients'):
                        self.test_patient_id = data['patients'][0]['id']
                        self.log(f"使用现有患者ID: {self.test_patient_id}")
                    else:
                        self.log("❌ 没有可用的患者数据", "ERROR")
                        return
                else:
                    self.log("❌ 无法获取患者列表", "ERROR")
                    return
            except Exception as e:
                self.log(f"❌ 获取患者列表异常: {str(e)}", "ERROR")
                return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        try:
            self.log(f"测试获取患者详情API (ID: {self.test_patient_id})...")
            response = requests.get(
                f"{self.backend_url}/api/v1/patients/{self.test_patient_id}",
                headers=headers,
                timeout=10
            )
            
            self.log(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ 获取患者详情API正常")
                self.log(f"患者姓名: {data.get('name', 'N/A')}")
                self.log(f"患者性别: {data.get('gender', 'N/A')}")
                self.log(f"患者年龄: {data.get('age', 'N/A')}")
                
                # 检查详情数据完整性
                detail_fields = ["id", "name", "gender", "birth_date", "phone", "email"]
                missing_fields = [field for field in detail_fields if field not in data]
                if missing_fields:
                    self.log(f"⚠️ 患者详情缺少字段: {missing_fields}", "WARNING")
                else:
                    self.log("✅ 患者详情数据完整")
                    
            else:
                self.log(f"❌ 获取患者详情API错误: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 获取患者详情API异常: {str(e)}", "ERROR")
    
    def test_update_patient_api(self):
        """测试更新患者API"""
        self.log("=" * 50)
        self.log("测试更新患者API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        if not self.test_patient_id:
            self.log("⚠️ 没有测试患者ID，跳过更新测试", "WARNING")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 更新数据
        update_data = {
            "phone": "13999999999",
            "address": "更新后的地址456号",
            "emergency_contact_phone": "13811111111"
        }
        
        try:
            self.log(f"测试更新患者API (ID: {self.test_patient_id})...")
            self.log(f"更新数据: {update_data}")
            
            response = requests.put(
                f"{self.backend_url}/api/v1/patients/{self.test_patient_id}",
                headers=headers,
                json=update_data,
                timeout=10
            )
            
            self.log(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.log("✅ 更新患者API正常")
                
                # 验证更新的数据
                for key, value in update_data.items():
                    if key in data and data[key] == value:
                        self.log(f"  ✅ {key} 更新成功: {value}")
                    else:
                        self.log(f"  ⚠️ {key} 更新可能失败: 期望 {value}, 实际 {data.get(key, 'N/A')}", "WARNING")
                        
            else:
                self.log(f"❌ 更新患者API错误: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 更新患者API异常: {str(e)}", "ERROR")
    
    def test_patients_search_api(self):
        """测试患者搜索API"""
        self.log("=" * 50)
        self.log("测试患者搜索API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 测试搜索功能
        search_params = [
            {"name": "姓名搜索", "params": "?search=李"},
            {"name": "性别筛选", "params": "?gender=male"},
            {"name": "分页测试", "params": "?page=1&page_size=2"},
        ]
        
        for search in search_params:
            try:
                self.log(f"测试 {search['name']}...")
                response = requests.get(
                    f"{self.backend_url}/api/v1/patients/{search['params']}",
                    headers=headers,
                    timeout=10
                )
                
                self.log(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"  ✅ {search['name']} 正常")
                    self.log(f"  返回患者数: {len(data.get('patients', []))}")
                    self.log(f"  总数: {data.get('total', 'N/A')}")
                else:
                    self.log(f"  ❌ {search['name']} 错误: {response.status_code}", "ERROR")
                    
            except Exception as e:
                self.log(f"  ❌ {search['name']} 异常: {str(e)}", "ERROR")
    
    def run_comprehensive_patients_test(self):
        """运行患者管理全面测试"""
        self.log("=" * 60)
        self.log("开始患者管理功能全面测试")
        self.log("=" * 60)
        
        # 1. 登录
        if not self.login():
            self.log("❌ 登录失败，无法继续测试", "ERROR")
            return
        
        # 2. 测试页面访问
        self.test_patients_page_access()
        
        # 3. 测试患者列表API
        self.test_patients_list_api()
        
        # 4. 测试添加患者API
        self.test_add_patient_api()
        
        # 5. 测试获取患者详情API
        self.test_get_patient_detail_api()
        
        # 6. 测试更新患者API
        self.test_update_patient_api()
        
        # 7. 测试患者搜索API
        self.test_patients_search_api()
        
        self.log("=" * 60)
        self.log("患者管理功能测试完成")
        self.log("=" * 60)

if __name__ == "__main__":
    tester = PatientsTester()
    tester.run_comprehensive_patients_test()
