#!/usr/bin/env python3
"""
模型中心功能详细测试脚本

测试内容：
1. 模型中心页面访问测试
2. AI模型相关API测试
3. 数据表检查
4. 硬编码数据检查
5. 模型管理功能测试

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

class ModelCenterTester:
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
    
    def test_model_center_pages(self):
        """测试模型中心页面访问"""
        logger.info("=" * 50)
        logger.info("测试模型中心页面访问")
        logger.info("=" * 50)
        
        pages = [
            ("/model-center", "模型中心主页"),
            ("/model-center/models", "模型管理"),
            ("/model-center/training", "模型训练"),
            ("/model-center/deployment", "模型部署"),
            ("/model-center/performance", "性能监控"),
        ]
        
        for path, name in pages:
            try:
                logger.info(f"测试 {name} 页面...")
                response = requests.get(f"{self.frontend_url}{path}")
                logger.info(f"  状态码: {response.status_code}")
                
                if response.status_code == 200:
                    content = response.text
                    # 检查页面是否包含模型相关内容
                    model_keywords = ["模型", "AI", "model", "训练", "training", "部署", "deployment"]
                    has_content = any(keyword in content for keyword in model_keywords)
                    
                    if has_content:
                        logger.info(f"  ✅ {name} 页面可以访问")
                        logger.info(f"  ✅ 页面包含模型相关内容")
                    else:
                        logger.warning(f"  ⚠️ {name} 页面可以访问但内容可疑")
                else:
                    logger.error(f"  ❌ {name} 页面访问失败")
                    
            except Exception as e:
                logger.error(f"  ❌ {name} 页面测试异常: {e}")
    
    def test_model_apis(self):
        """测试模型相关API"""
        logger.info("=" * 50)
        logger.info("测试模型相关API")
        logger.info("=" * 50)
        
        apis = [
            ("GET", "/api/v1/models/", "模型列表"),
            ("GET", "/api/v1/models/1", "模型详情"),
            ("GET", "/api/v1/models/stats", "模型统计"),
            ("GET", "/api/v1/ai-diagnosis/ai/models", "AI诊断模型"),
            ("GET", "/api/v1/ai-diagnosis/ai/analysis/test", "AI预测结果"),
            ("GET", "/api/v1/monitoring/models", "模型监控"),
            ("GET", "/api/v1/system/models", "系统模型"),
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
    
    def check_model_tables(self):
        """检查模型相关数据表"""
        logger.info("=" * 50)
        logger.info("检查模型相关数据表")
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
                ("ai_models", "AI模型表"),
                ("model_versions", "模型版本表"),
                ("model_training_jobs", "模型训练任务表"),
                ("model_deployments", "模型部署表"),
                ("model_predictions", "模型预测记录表"),
                ("model_performance", "模型性能表"),
                ("model_permissions", "模型权限表"),
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
    
    def test_model_functionality(self):
        """测试模型功能"""
        logger.info("=" * 50)
        logger.info("测试模型功能")
        logger.info("=" * 50)
        
        try:
            # 测试模型列表
            logger.info("测试模型列表...")
            response = requests.get(f"{self.base_url}/api/v1/models/", headers=self.headers)
            logger.info(f"  状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"  ✅ 模型列表获取成功")
                logger.info(f"  模型数量: {len(data) if isinstance(data, list) else '未知'}")
            else:
                logger.error(f"  ❌ 获取模型列表失败: {response.text}")
            
            # 测试AI诊断功能
            logger.info("测试AI诊断功能...")
            response = requests.get(f"{self.base_url}/api/v1/ai-diagnosis/models", headers=self.headers)
            logger.info(f"  状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"  ✅ AI诊断模型获取成功")
                logger.info(f"  诊断模型数量: {len(data) if isinstance(data, list) else '未知'}")
            else:
                logger.error(f"  ❌ 获取AI诊断模型失败: {response.text}")
            
            # 测试模型统计
            logger.info("测试模型统计...")
            response = requests.get(f"{self.base_url}/api/v1/models/stats", headers=self.headers)
            logger.info(f"  状态码: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"  ✅ 模型统计获取成功")
                logger.info(f"  统计数据: {json.dumps(data, indent=2, ensure_ascii=False)}")
            else:
                logger.error(f"  ❌ 获取模型统计失败: {response.text}")
                    
        except Exception as e:
            logger.error(f"模型功能测试失败: {e}")
    
    def check_hardcoded_data(self):
        """检查硬编码数据"""
        logger.info("=" * 50)
        logger.info("检查模型中心硬编码数据")
        logger.info("=" * 50)
        
        try:
            # 检查模型中心页面源码
            response = requests.get(f"{self.frontend_url}/model-center")
            if response.status_code == 200:
                content = response.text
                
                # 检查是否有硬编码的模型数据
                hardcoded_indicators = [
                    "const models = [",
                    "const mockModels",
                    "硬编码",
                    "mock",
                    "示例模型",
                    "测试模型"
                ]
                
                found_hardcoded = []
                for indicator in hardcoded_indicators:
                    if indicator in content:
                        found_hardcoded.append(indicator)
                
                if found_hardcoded:
                    logger.warning(f"  ⚠️ 发现可能的硬编码数据: {found_hardcoded}")
                else:
                    logger.info(f"  ✅ 未发现明显的硬编码数据")
            else:
                logger.error(f"  ❌ 无法获取页面内容进行硬编码检查")
                
        except Exception as e:
            logger.error(f"硬编码数据检查失败: {e}")
    
    def run_all_tests(self):
        """运行所有测试"""
        logger.info("=" * 60)
        logger.info("开始模型中心功能全面测试")
        logger.info("=" * 60)
        
        # 1. 登录
        if not self.login():
            logger.error("登录失败，无法继续测试")
            return
        
        # 2. 测试页面访问
        self.test_model_center_pages()
        
        # 3. 测试API
        self.test_model_apis()
        
        # 4. 检查数据表
        self.check_model_tables()
        
        # 5. 测试模型功能
        self.test_model_functionality()
        
        # 6. 检查硬编码数据
        self.check_hardcoded_data()
        
        logger.info("=" * 60)
        logger.info("模型中心功能测试完成")
        logger.info("=" * 60)

if __name__ == "__main__":
    tester = ModelCenterTester()
    tester.run_all_tests()
