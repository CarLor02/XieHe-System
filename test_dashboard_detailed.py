#!/usr/bin/env python3
"""
工作台页面详细功能测试

测试工作台页面的所有功能，包括：
1. API调用测试
2. 数据显示测试
3. 硬编码数据检查
4. 错误处理测试

作者: XieHe Medical System
创建时间: 2025-09-29
"""

import requests
import json
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
import traceback

class DashboardTester:
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
    
    def test_dashboard_apis(self):
        """测试工作台相关的API"""
        self.log("=" * 50)
        self.log("测试工作台API接口")
        self.log("=" * 50)
        
        # 测试不需要认证的API
        apis_no_auth = [
            {
                "name": "仪表板统计(无认证)",
                "url": "/api/v1/dashboard/stats",
                "expected_fields": ["total_patients", "total_images", "total_reports"]
            }
        ]
        
        # 测试需要认证的API
        apis_with_auth = [
            {
                "name": "仪表板统计(有认证)",
                "url": "/api/v1/dashboard/stats",
                "expected_fields": ["total_patients", "total_images", "total_reports"]
            },
            {
                "name": "仪表板概览",
                "url": "/api/v1/dashboard/overview",
                "expected_fields": ["total_patients", "total_studies", "total_reports"]
            },
            {
                "name": "最近任务",
                "url": "/api/v1/studies/?status=pending&page=1&page_size=5",
                "expected_fields": ["studies", "total", "page"]
            }
        ]
        
        # 测试无认证API
        for api in apis_no_auth:
            self.log(f"测试 {api['name']}...")
            try:
                response = requests.get(f"{self.backend_url}{api['url']}", timeout=10)
                self.log(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    data = response.json()
                    self.log(f"  ✅ 成功获取数据")
                    self.log(f"  数据字段: {list(data.keys())}")
                    
                    # 检查必要字段
                    missing_fields = [field for field in api['expected_fields'] if field not in data]
                    if missing_fields:
                        self.log(f"  ⚠️ 缺少字段: {missing_fields}", "WARNING")
                    else:
                        self.log(f"  ✅ 所有必要字段都存在")
                        
                    # 显示数据内容
                    for field in api['expected_fields']:
                        if field in data:
                            self.log(f"  {field}: {data[field]}")
                else:
                    self.log(f"  ❌ API错误: {response.status_code}", "ERROR")
                    self.log(f"  错误内容: {response.text[:200]}", "ERROR")
                    
            except Exception as e:
                self.log(f"  ❌ 异常: {str(e)}", "ERROR")
        
        # 测试需要认证的API
        if self.access_token:
            headers = {"Authorization": f"Bearer {self.access_token}"}
            
            for api in apis_with_auth:
                self.log(f"测试 {api['name']}...")
                try:
                    response = requests.get(
                        f"{self.backend_url}{api['url']}", 
                        headers=headers,
                        timeout=10
                    )
                    self.log(f"  状态码: {response.status_code}")
                    
                    if response.status_code == 200:
                        data = response.json()
                        self.log(f"  ✅ 成功获取数据")
                        self.log(f"  数据字段: {list(data.keys())}")
                        
                        # 检查必要字段
                        missing_fields = [field for field in api['expected_fields'] if field not in data]
                        if missing_fields:
                            self.log(f"  ⚠️ 缺少字段: {missing_fields}", "WARNING")
                        else:
                            self.log(f"  ✅ 所有必要字段都存在")
                            
                        # 显示数据内容
                        for field in api['expected_fields']:
                            if field in data:
                                value = data[field]
                                if isinstance(value, list):
                                    self.log(f"  {field}: 列表({len(value)}个元素)")
                                    if value and isinstance(value[0], dict):
                                        self.log(f"    示例元素字段: {list(value[0].keys())}")
                                else:
                                    self.log(f"  {field}: {value}")
                    else:
                        self.log(f"  ❌ API错误: {response.status_code}", "ERROR")
                        self.log(f"  错误内容: {response.text[:200]}", "ERROR")
                        
                except Exception as e:
                    self.log(f"  ❌ 异常: {str(e)}", "ERROR")
    
    def test_dashboard_frontend(self):
        """测试工作台前端页面"""
        self.log("=" * 50)
        self.log("测试工作台前端页面")
        self.log("=" * 50)
        
        try:
            # 配置Chrome选项
            chrome_options = Options()
            chrome_options.add_argument('--headless')  # 无头模式
            chrome_options.add_argument('--no-sandbox')
            chrome_options.add_argument('--disable-dev-shm-usage')
            chrome_options.add_argument('--disable-gpu')
            
            # 启动浏览器
            self.log("启动浏览器...")
            driver = webdriver.Chrome(options=chrome_options)
            wait = WebDriverWait(driver, 10)
            
            try:
                # 访问登录页面
                self.log("访问登录页面...")
                driver.get(f"{self.frontend_url}/auth/login")
                
                # 等待页面加载
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                self.log("✅ 登录页面加载成功")
                
                # 查找登录表单元素
                username_input = wait.until(EC.presence_of_element_located((By.NAME, "username")))
                password_input = driver.find_element(By.NAME, "password")
                login_button = driver.find_element(By.TYPE, "submit")
                
                # 填写登录信息
                self.log("填写登录信息...")
                username_input.send_keys("admin")
                password_input.send_keys("secret")
                
                # 点击登录
                self.log("点击登录按钮...")
                login_button.click()
                
                # 等待跳转到主页或工作台
                time.sleep(3)
                current_url = driver.current_url
                self.log(f"登录后URL: {current_url}")
                
                # 访问工作台页面
                self.log("访问工作台页面...")
                driver.get(f"{self.frontend_url}/dashboard")
                
                # 等待页面加载
                time.sleep(5)
                
                # 检查页面标题
                page_title = driver.title
                self.log(f"页面标题: {page_title}")
                
                # 检查是否有错误信息
                try:
                    error_elements = driver.find_elements(By.XPATH, "//*[contains(text(), 'Error') or contains(text(), '错误') or contains(text(), 'AxiosError')]")
                    if error_elements:
                        self.log("❌ 发现页面错误:", "ERROR")
                        for element in error_elements:
                            self.log(f"  错误信息: {element.text}", "ERROR")
                    else:
                        self.log("✅ 未发现明显错误信息")
                except:
                    pass
                
                # 检查统计卡片
                try:
                    stat_cards = driver.find_elements(By.CSS_SELECTOR, "[class*='bg-white'][class*='rounded']")
                    self.log(f"找到 {len(stat_cards)} 个统计卡片")
                    
                    for i, card in enumerate(stat_cards[:4]):  # 只检查前4个
                        card_text = card.text
                        if card_text:
                            self.log(f"  卡片{i+1}: {card_text[:100]}")
                except Exception as e:
                    self.log(f"检查统计卡片时出错: {str(e)}", "ERROR")
                
                # 检查是否有加载状态
                try:
                    loading_elements = driver.find_elements(By.XPATH, "//*[contains(text(), '加载') or contains(text(), 'Loading')]")
                    if loading_elements:
                        self.log("⚠️ 页面仍在加载中", "WARNING")
                except:
                    pass
                
                # 截图保存
                try:
                    screenshot_path = "dashboard_screenshot.png"
                    driver.save_screenshot(screenshot_path)
                    self.log(f"✅ 页面截图已保存: {screenshot_path}")
                except Exception as e:
                    self.log(f"保存截图失败: {str(e)}", "ERROR")
                
                self.log("✅ 工作台页面测试完成")
                
            finally:
                driver.quit()
                
        except Exception as e:
            self.log(f"❌ 前端测试异常: {str(e)}", "ERROR")
            self.log(f"详细错误: {traceback.format_exc()}", "ERROR")
    
    def test_dashboard_data_flow(self):
        """测试工作台数据流"""
        self.log("=" * 50)
        self.log("测试工作台数据流")
        self.log("=" * 50)
        
        # 测试前端API调用路径
        frontend_api_paths = [
            "/api/dashboard/stats",
            "/api/dashboard/overview", 
            "/api/v1/dashboard/stats",
            "/api/v1/dashboard/overview"
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
    
    def run_comprehensive_dashboard_test(self):
        """运行工作台全面测试"""
        self.log("=" * 60)
        self.log("开始工作台页面全面功能测试")
        self.log("=" * 60)
        
        # 1. 登录
        if not self.login():
            self.log("❌ 登录失败，无法继续测试", "ERROR")
            return
        
        # 2. 测试API接口
        self.test_dashboard_apis()
        
        # 3. 测试数据流
        self.test_dashboard_data_flow()
        
        # 4. 测试前端页面（需要Chrome浏览器）
        try:
            self.test_dashboard_frontend()
        except Exception as e:
            self.log(f"⚠️ 前端测试跳过（可能缺少Chrome浏览器）: {str(e)}", "WARNING")
        
        self.log("=" * 60)
        self.log("工作台页面测试完成")
        self.log("=" * 60)

if __name__ == "__main__":
    tester = DashboardTester()
    tester.run_comprehensive_dashboard_test()
