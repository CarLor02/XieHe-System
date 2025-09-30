#!/usr/bin/env python3
"""
XieHe医疗影像诊断系统 - 全面自动化测试脚本

测试所有API接口，检查返回数据格式和内容，验证系统功能完整性

@author XieHe Medical System
@created 2025-09-29
"""

import requests
import json
import logging
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
import sys
import os

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class SystemTester:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.frontend_url = "http://localhost:3000"
        self.token = None
        self.headers = {}
        self.test_results = {
            'total_tests': 0,
            'passed_tests': 0,
            'failed_tests': 0,
            'api_tests': {},
            'frontend_tests': {},
            'data_validation': {}
        }
        
    def login(self) -> bool:
        """登录获取认证token"""
        try:
            logger.info("🔐 开始登录...")
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
    
    def test_api_endpoint(self, method: str, endpoint: str, name: str, 
                         expected_status: int = 200, 
                         data: Optional[Dict] = None,
                         validate_response: Optional[callable] = None) -> bool:
        """测试单个API端点"""
        self.test_results['total_tests'] += 1
        
        try:
            logger.info(f"🔍 测试 {name} ({method} {endpoint})...")
            
            if method.upper() == "GET":
                response = requests.get(f"{self.base_url}{endpoint}", headers=self.headers)
            elif method.upper() == "POST":
                response = requests.post(f"{self.base_url}{endpoint}", headers=self.headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(f"{self.base_url}{endpoint}", headers=self.headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(f"{self.base_url}{endpoint}", headers=self.headers)
            else:
                logger.error(f"  ❌ 不支持的HTTP方法: {method}")
                self.test_results['failed_tests'] += 1
                return False
            
            # 检查状态码
            if response.status_code != expected_status:
                logger.error(f"  ❌ 状态码错误: 期望{expected_status}, 实际{response.status_code}")
                logger.error(f"  响应内容: {response.text[:200]}")
                self.test_results['failed_tests'] += 1
                self.test_results['api_tests'][name] = {
                    'status': 'FAILED',
                    'error': f"状态码错误: {response.status_code}",
                    'response': response.text[:200]
                }
                return False
            
            # 尝试解析JSON响应
            try:
                response_data = response.json()
            except:
                if expected_status == 200:
                    logger.warning(f"  ⚠️ 响应不是JSON格式")
                response_data = None
            
            # 自定义验证
            if validate_response and response_data:
                validation_result = validate_response(response_data)
                if not validation_result:
                    logger.error(f"  ❌ 响应数据验证失败")
                    self.test_results['failed_tests'] += 1
                    self.test_results['api_tests'][name] = {
                        'status': 'FAILED',
                        'error': '响应数据验证失败',
                        'response': response_data
                    }
                    return False
            
            logger.info(f"  ✅ {name} 测试通过")
            self.test_results['passed_tests'] += 1
            self.test_results['api_tests'][name] = {
                'status': 'PASSED',
                'status_code': response.status_code,
                'response_type': type(response_data).__name__ if response_data else 'text',
                'data_sample': str(response_data)[:100] if response_data else response.text[:100]
            }
            return True
            
        except Exception as e:
            logger.error(f"  ❌ {name} 测试异常: {e}")
            self.test_results['failed_tests'] += 1
            self.test_results['api_tests'][name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            return False
    
    def test_frontend_page(self, path: str, name: str) -> bool:
        """测试前端页面"""
        self.test_results['total_tests'] += 1
        
        try:
            logger.info(f"🌐 测试前端页面: {name} ({path})")
            response = requests.get(f"{self.frontend_url}{path}")
            
            if response.status_code == 200:
                logger.info(f"  ✅ {name} 页面可访问")
                self.test_results['passed_tests'] += 1
                self.test_results['frontend_tests'][name] = {
                    'status': 'PASSED',
                    'status_code': response.status_code,
                    'content_length': len(response.text)
                }
                return True
            else:
                logger.error(f"  ❌ {name} 页面访问失败: {response.status_code}")
                self.test_results['failed_tests'] += 1
                self.test_results['frontend_tests'][name] = {
                    'status': 'FAILED',
                    'status_code': response.status_code,
                    'error': f"HTTP {response.status_code}"
                }
                return False
                
        except Exception as e:
            logger.error(f"  ❌ {name} 页面测试异常: {e}")
            self.test_results['failed_tests'] += 1
            self.test_results['frontend_tests'][name] = {
                'status': 'FAILED',
                'error': str(e)
            }
            return False
    
    def validate_patient_list(self, data: Dict) -> bool:
        """验证患者列表数据格式"""
        if not isinstance(data, dict):
            return False

        # 检查必要的分页字段
        required_fields = ['patients', 'total', 'page', 'page_size']
        if not all(field in data for field in required_fields):
            return False

        patients = data['patients']
        if not isinstance(patients, list):
            return False

        if len(patients) == 0:
            return True  # 空列表也是有效的

        # 检查第一个患者的必要字段
        patient = patients[0]
        required_fields = ['id', 'name', 'gender', 'birth_date']
        return all(field in patient for field in required_fields)

    def validate_study_list(self, data: Dict) -> bool:
        """验证影像检查列表数据格式"""
        if not isinstance(data, dict):
            return False

        # 检查必要的分页字段
        required_fields = ['studies', 'total', 'page', 'page_size']
        if not all(field in data for field in required_fields):
            return False

        studies = data['studies']
        if not isinstance(studies, list):
            return False

        if len(studies) == 0:
            return True

        study = studies[0]
        required_fields = ['id', 'study_id', 'patient_id', 'modality']
        return all(field in study for field in required_fields)
    
    def validate_model_list(self, data: Dict) -> bool:
        """验证模型列表数据格式"""
        if not isinstance(data, dict):
            return False
        
        if 'models' not in data:
            return False
        
        models = data['models']
        if not isinstance(models, list):
            return False
        
        if len(models) == 0:
            return True
        
        model = models[0]
        required_fields = ['id', 'name', 'model_type', 'status']
        return all(field in model for field in required_fields)
    
    def test_authentication_apis(self):
        """测试认证相关API"""
        logger.info("=" * 60)
        logger.info("测试认证相关API")
        logger.info("=" * 60)
        
        # 测试健康检查
        self.test_api_endpoint("GET", "/health", "健康检查", 200)
        
        # 测试登录（已经在login中测试过）
        logger.info("🔍 测试登录API...")
        logger.info("  ✅ 登录API 测试通过（已验证）")
        self.test_results['total_tests'] += 1
        self.test_results['passed_tests'] += 1
        self.test_results['api_tests']['登录API'] = {
            'status': 'PASSED',
            'status_code': 200,
            'note': '已在初始化时验证'
        }
    
    def test_patient_apis(self):
        """测试患者管理API"""
        logger.info("=" * 60)
        logger.info("测试患者管理API")
        logger.info("=" * 60)

        # 测试患者列表
        self.test_api_endpoint(
            "GET", "/api/v1/patients/", "患者列表",
            validate_response=self.validate_patient_list
        )

        # 测试患者搜索
        self.test_api_endpoint("GET", "/api/v1/patients/?search=张", "患者搜索")

        # 测试获取单个患者详情（使用第一个患者ID）
        self.test_api_endpoint("GET", "/api/v1/patients/1", "患者详情")
    
    def test_study_apis(self):
        """测试影像检查API"""
        logger.info("=" * 60)
        logger.info("测试影像检查API")
        logger.info("=" * 60)

        # 测试影像检查列表
        self.test_api_endpoint(
            "GET", "/api/v1/studies/", "影像检查列表",
            validate_response=self.validate_study_list
        )

        # 测试获取单个影像检查详情
        self.test_api_endpoint("GET", "/api/v1/studies/1", "影像检查详情")
    
    def test_model_apis(self):
        """测试模型管理API"""
        logger.info("=" * 60)
        logger.info("测试模型管理API")
        logger.info("=" * 60)
        
        # 测试模型列表
        self.test_api_endpoint(
            "GET", "/api/v1/models/", "模型列表",
            validate_response=self.validate_model_list
        )
        
        # 测试模型统计
        self.test_api_endpoint("GET", "/api/v1/models/stats", "模型统计")
        
        # 测试单个模型详情
        self.test_api_endpoint("GET", "/api/v1/models/MODEL_001", "模型详情")
    
    def test_permission_apis(self):
        """测试权限管理API"""
        logger.info("=" * 60)
        logger.info("测试权限管理API")
        logger.info("=" * 60)

        # 测试权限列表
        self.test_api_endpoint("GET", "/api/v1/permissions/permissions", "权限列表")

        # 测试角色列表
        self.test_api_endpoint("GET", "/api/v1/permissions/roles", "角色列表")

        # 测试用户组
        self.test_api_endpoint("GET", "/api/v1/permissions/user-groups", "用户组列表")

        # 测试权限矩阵
        self.test_api_endpoint("GET", "/api/v1/permissions/permission-matrix", "权限矩阵")
    
    def test_ai_diagnosis_apis(self):
        """测试AI诊断API"""
        logger.info("=" * 60)
        logger.info("测试AI诊断API")
        logger.info("=" * 60)
        
        # 测试AI模型列表
        self.test_api_endpoint("GET", "/api/v1/ai-diagnosis/ai/models", "AI诊断模型列表")
    
    def test_frontend_pages(self):
        """测试前端页面"""
        logger.info("=" * 60)
        logger.info("测试前端页面")
        logger.info("=" * 60)
        
        pages = [
            ("/", "主页"),
            ("/dashboard", "工作台"),
            ("/patients", "患者管理"),
            ("/patients/add", "添加患者"),
            ("/imaging", "影像中心"),
            ("/upload", "影像上传"),
            ("/reports", "报告管理"),
            ("/permissions", "权限管理"),
            ("/permissions/roles", "角色管理"),
            ("/permissions/users", "用户权限"),
            ("/model-center", "模型中心"),
        ]
        
        for path, name in pages:
            self.test_frontend_page(path, name)
    
    def generate_report(self):
        """生成测试报告"""
        logger.info("=" * 60)
        logger.info("生成测试报告")
        logger.info("=" * 60)

        total = self.test_results['total_tests']
        passed = self.test_results['passed_tests']
        failed = self.test_results['failed_tests']
        success_rate = (passed / total * 100) if total > 0 else 0

        logger.info(f"📊 测试总结:")
        logger.info(f"  总测试数: {total}")
        logger.info(f"  通过测试: {passed}")
        logger.info(f"  失败测试: {failed}")
        logger.info(f"  成功率: {success_rate:.1f}%")

        if failed > 0:
            logger.info(f"\n❌ 失败的测试:")
            for category in ['api_tests', 'frontend_tests']:
                for name, result in self.test_results[category].items():
                    if result['status'] == 'FAILED':
                        logger.info(f"  - {name}: {result.get('error', '未知错误')}")

        # 保存详细报告到文件
        report_file = f"test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.test_results, f, ensure_ascii=False, indent=2, default=str)

        logger.info(f"\n📄 详细报告已保存到: {report_file}")

        return success_rate >= 80  # 80%以上通过率认为测试成功

    def run_all_tests(self):
        """运行所有测试"""
        logger.info("🚀 开始全面系统测试")
        logger.info("=" * 60)

        start_time = time.time()

        # 1. 登录
        if not self.login():
            logger.error("登录失败，无法继续测试")
            return False

        # 2. 测试各个模块
        self.test_authentication_apis()
        self.test_patient_apis()
        self.test_study_apis()
        self.test_model_apis()
        self.test_permission_apis()
        self.test_ai_diagnosis_apis()
        self.test_frontend_pages()

        # 3. 生成报告
        end_time = time.time()
        duration = end_time - start_time

        logger.info(f"\n⏱️ 测试耗时: {duration:.2f}秒")

        success = self.generate_report()

        if success:
            logger.info("\n🎉 系统测试完成 - 整体状态良好")
        else:
            logger.info("\n⚠️ 系统测试完成 - 发现问题需要修复")

        return success

if __name__ == "__main__":
    tester = SystemTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)
