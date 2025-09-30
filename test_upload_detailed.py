#!/usr/bin/env python3
"""
文件上传功能详细测试

测试文件上传页面的所有功能，包括：
1. 患者列表加载测试
2. 文件上传API测试
3. 前端页面功能测试
4. 错误处理测试

作者: XieHe Medical System
创建时间: 2025-09-29
"""

import requests
import json
import os
import tempfile
from datetime import datetime
from typing import Dict, List, Any

class UploadTester:
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
    
    def test_patients_api(self):
        """测试患者列表API"""
        self.log("=" * 50)
        self.log("测试患者列表API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 测试患者列表API
        try:
            self.log("测试患者列表API...")
            response = requests.get(
                f"{self.backend_url}/api/v1/patients/?page=1&page_size=100",
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
                    
                    if patients:
                        patient = patients[0]
                        self.log(f"示例患者字段: {list(patient.keys())}")
                        self.log(f"示例患者: ID={patient.get('id')}, 姓名={patient.get('name')}")
                    else:
                        self.log("⚠️ 患者列表为空", "WARNING")
                else:
                    self.log("❌ 响应中缺少patients字段", "ERROR")
            else:
                self.log(f"❌ 患者列表API错误: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 患者列表API异常: {str(e)}", "ERROR")
    
    def test_upload_api(self):
        """测试文件上传API"""
        self.log("=" * 50)
        self.log("测试文件上传API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 创建测试文件
        try:
            # 创建一个临时测试图像文件（PNG格式）
            with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as f:
                # 创建一个简单的PNG图像数据
                # PNG文件头
                png_header = b'\x89PNG\r\n\x1a\n'
                # IHDR chunk (13字节数据 + 12字节chunk结构)
                ihdr_data = b'\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00'  # 1x1像素，RGB
                ihdr_crc = b'\x90wS\xde'  # 预计算的CRC
                ihdr_chunk = b'\x00\x00\x00\r' + b'IHDR' + ihdr_data + ihdr_crc
                # IDAT chunk (最小数据)
                idat_data = b'\x08\x1d\x01\x00\x00\x00\xff\xff\x00\x00\x00\x02\x00\x01'
                idat_crc = b'\x8d\xb4\x2c\xfa'  # 预计算的CRC
                idat_chunk = b'\x00\x00\x00\x0e' + b'IDAT' + idat_data + idat_crc
                # IEND chunk
                iend_chunk = b'\x00\x00\x00\x00' + b'IEND' + b'\xaeB`\x82'

                # 写入完整的PNG文件
                f.write(png_header + ihdr_chunk + idat_chunk + iend_chunk)
                test_file_path = f.name
            
            self.log(f"创建测试文件: {test_file_path}")

            # 测试文件上传
            self.log("测试文件上传API...")

            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_upload.png', f, 'image/png')}
                data = {
                    'patient_id': '1',  # 使用第一个患者ID
                    'description': '测试上传文件'
                }
                
                response = requests.post(
                    f"{self.backend_url}/api/v1/upload/single",
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=30
                )
            
            self.log(f"上传状态码: {response.status_code}")
            
            if response.status_code == 200:
                self.log("✅ 文件上传成功")
                try:
                    result = response.json()
                    self.log(f"上传结果: {result}")
                except:
                    self.log(f"上传响应: {response.text[:200]}")
            else:
                self.log(f"❌ 文件上传失败: {response.status_code}", "ERROR")
                self.log(f"错误内容: {response.text[:200]}", "ERROR")
            
            # 清理测试文件
            os.unlink(test_file_path)
            self.log("清理测试文件")
            
        except Exception as e:
            self.log(f"❌ 文件上传测试异常: {str(e)}", "ERROR")
    
    def test_upload_page_access(self):
        """测试上传页面访问"""
        self.log("=" * 50)
        self.log("测试上传页面访问")
        self.log("=" * 50)
        
        try:
            # 测试上传页面
            self.log("测试上传页面...")
            response = requests.get(f"{self.frontend_url}/upload", timeout=10)
            self.log(f"上传页面状态码: {response.status_code}")
            
            if response.status_code == 200:
                self.log("✅ 上传页面可以访问")
                
                # 检查页面内容
                content = response.text
                if "选择患者" in content:
                    self.log("✅ 页面包含患者选择功能")
                else:
                    self.log("⚠️ 页面可能缺少患者选择功能", "WARNING")
                
                if "上传文件" in content or "拖拽文件" in content:
                    self.log("✅ 页面包含文件上传功能")
                else:
                    self.log("⚠️ 页面可能缺少文件上传功能", "WARNING")
                    
            else:
                self.log(f"❌ 上传页面访问失败: {response.status_code}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ 上传页面测试异常: {str(e)}", "ERROR")
    
    def test_upload_related_apis(self):
        """测试上传相关的其他API"""
        self.log("=" * 50)
        self.log("测试上传相关API")
        self.log("=" * 50)
        
        if not self.access_token:
            self.log("❌ 无访问令牌，跳过测试", "ERROR")
            return
        
        headers = {"Authorization": f"Bearer {self.access_token}"}
        
        # 测试可能的上传相关API
        apis_to_test = [
            {
                "name": "上传单个文件",
                "url": "/api/v1/upload/single",
                "method": "POST",
                "note": "需要文件数据，这里只测试端点是否存在"
            },
            {
                "name": "上传多个文件",
                "url": "/api/v1/upload/multiple",
                "method": "POST",
                "note": "需要文件数据，这里只测试端点是否存在"
            },
            {
                "name": "获取上传历史",
                "url": "/api/v1/upload/history",
                "method": "GET",
                "note": "获取上传历史记录"
            },
            {
                "name": "文件管理",
                "url": "/api/v1/files/",
                "method": "GET",
                "note": "文件管理接口"
            }
        ]
        
        for api in apis_to_test:
            try:
                self.log(f"测试 {api['name']} ({api['url']})...")
                
                if api['method'] == 'GET':
                    response = requests.get(
                        f"{self.backend_url}{api['url']}",
                        headers=headers,
                        timeout=10
                    )
                else:
                    # 对于POST请求，只发送空请求来测试端点
                    response = requests.post(
                        f"{self.backend_url}{api['url']}",
                        headers=headers,
                        timeout=10
                    )
                
                self.log(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    self.log(f"  ✅ {api['name']} API正常")
                elif response.status_code == 404:
                    self.log(f"  ⚠️ {api['name']} API不存在", "WARNING")
                elif response.status_code == 422:
                    self.log(f"  ⚠️ {api['name']} API存在但参数错误（正常）", "WARNING")
                else:
                    self.log(f"  ❌ {api['name']} API错误: {response.status_code}", "ERROR")
                    
            except Exception as e:
                self.log(f"  ❌ {api['name']} API异常: {str(e)}", "ERROR")
    
    def test_backend_upload_endpoint(self):
        """详细测试后端上传端点"""
        self.log("=" * 50)
        self.log("详细测试后端上传端点")
        self.log("=" * 50)
        
        # 首先检查端点是否存在
        try:
            self.log("检查上传端点是否存在...")
            response = requests.options(f"{self.backend_url}/api/v1/upload/single")
            self.log(f"OPTIONS请求状态码: {response.status_code}")
            
            if response.status_code in [200, 204]:
                self.log("✅ 上传端点存在")
                allowed_methods = response.headers.get('Allow', '')
                self.log(f"允许的方法: {allowed_methods}")
            else:
                self.log("⚠️ 上传端点可能不存在", "WARNING")
                
        except Exception as e:
            self.log(f"检查端点异常: {str(e)}", "ERROR")
    
    def run_comprehensive_upload_test(self):
        """运行文件上传全面测试"""
        self.log("=" * 60)
        self.log("开始文件上传功能全面测试")
        self.log("=" * 60)
        
        # 1. 登录
        if not self.login():
            self.log("❌ 登录失败，无法继续测试", "ERROR")
            return
        
        # 2. 测试上传页面访问
        self.test_upload_page_access()
        
        # 3. 测试患者列表API
        self.test_patients_api()
        
        # 4. 测试后端上传端点
        self.test_backend_upload_endpoint()
        
        # 5. 测试上传相关API
        self.test_upload_related_apis()
        
        # 6. 测试实际文件上传
        self.test_upload_api()
        
        self.log("=" * 60)
        self.log("文件上传功能测试完成")
        self.log("=" * 60)

if __name__ == "__main__":
    tester = UploadTester()
    tester.run_comprehensive_upload_test()
