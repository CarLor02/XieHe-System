#!/usr/bin/env python3
"""
报告管理功能详细测试脚本
测试报告列表、报告生成、报告模板等功能
"""

import requests
import json
import logging
from datetime import datetime

# 设置日志
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

def test_reports_management():
    logger.info('=' * 60)
    logger.info('开始报告管理功能全面测试')
    logger.info('=' * 60)
    
    # 登录获取token
    logger.info('开始登录...')
    login_response = requests.post(
        'http://localhost:8000/api/v1/auth/login',
        json={'username': 'admin', 'password': 'secret', 'remember_me': False}
    )
    
    if login_response.status_code != 200:
        logger.error(f'❌ 登录失败: {login_response.status_code}')
        return
    
    token = login_response.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    logger.info('✅ 登录成功')
    
    # 测试报告管理页面访问
    logger.info('=' * 50)
    logger.info('测试报告管理页面访问')
    logger.info('=' * 50)
    
    pages = [
        ('报告列表', 'http://localhost:3000/reports'),
    ]
    
    for page_name, url in pages:
        logger.info(f'测试 {page_name} 页面...')
        try:
            response = requests.get(url, timeout=10)
            logger.info(f'  状态码: {response.status_code}')
            if response.status_code == 200:
                logger.info(f'  ✅ {page_name} 页面可以访问')
                if '报告' in response.text or 'report' in response.text.lower():
                    logger.info(f'  ✅ 页面包含报告相关内容')
                else:
                    logger.warning(f'  ⚠️ 页面可能缺少报告相关内容')
            else:
                logger.error(f'  ❌ {page_name} 页面访问失败')
        except Exception as e:
            logger.error(f'  ❌ {page_name} 页面访问异常: {e}')
    
    # 测试报告相关API
    logger.info('=' * 50)
    logger.info('测试报告相关API')
    logger.info('=' * 50)
    
    api_tests = [
        ('报告列表', 'GET', '/api/v1/reports/'),
        ('报告模板', 'GET', '/api/v1/reports/templates'),
        ('报告统计', 'GET', '/api/v1/reports/stats'),
        ('创建报告', 'POST', '/api/v1/reports/'),
    ]
    
    for test_name, method, endpoint in api_tests:
        logger.info(f'测试 {test_name} ({method} {endpoint})...')
        try:
            url = f'http://localhost:8000{endpoint}'
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                # 创建报告需要数据
                test_data = {
                    'study_id': 1,
                    'template_id': 1,
                    'findings': '测试发现',
                    'impression': '测试印象',
                    'recommendations': '测试建议'
                }
                response = requests.post(url, headers=headers, json=test_data)
            
            logger.info(f'  状态码: {response.status_code}')
            
            if response.status_code == 200:
                logger.info(f'  ✅ {test_name} API正常')
                try:
                    data = response.json()
                    if isinstance(data, dict):
                        logger.info(f'  数据字段: {list(data.keys())}')
                    elif isinstance(data, list):
                        logger.info(f'  返回列表，长度: {len(data)}')
                        if data:
                            logger.info(f'  示例元素字段: {list(data[0].keys()) if isinstance(data[0], dict) else "非字典类型"}')
                except:
                    logger.info(f'  响应内容: {response.text[:200]}...')
            elif response.status_code == 404:
                logger.warning(f'  ⚠️ {test_name} API不存在')
            elif response.status_code == 422:
                logger.warning(f'  ⚠️ {test_name} API参数错误（正常）')
            else:
                logger.error(f'  ❌ {test_name} API错误: {response.status_code}')
                logger.error(f'  错误内容: {response.text}')
        except Exception as e:
            logger.error(f'  ❌ {test_name} API异常: {e}')
    
    # 检查数据库表
    logger.info('=' * 50)
    logger.info('检查报告相关数据表')
    logger.info('=' * 50)
    
    table_check_script = '''
import sys
sys.path.append('/xinray/data/百度云/xhe/XieHe-System/backend')
from app.core.database import get_db

db = next(get_db())
try:
    tables_to_check = [
        'diagnostic_reports',
        'report_templates', 
        'report_sections',
        'report_attachments'
    ]
    
    for table in tables_to_check:
        result = db.execute(f'SHOW TABLES LIKE "{table}"').fetchall()
        if result:
            print(f'✅ {table}表存在')
            # 查看记录数
            count_result = db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()
            print(f'  记录数: {count_result[0]}')
        else:
            print(f'❌ {table}表不存在')
            
finally:
    db.close()
'''
    
    try:
        import subprocess
        result = subprocess.run(['python3', '-c', table_check_script], 
                              capture_output=True, text=True, cwd='/xinray/data/百度云/xhe/XieHe-System')
        logger.info('数据表检查结果:')
        for line in result.stdout.strip().split('\n'):
            if line.strip():
                logger.info(f'  {line}')
        if result.stderr:
            logger.warning(f'检查过程中的警告: {result.stderr}')
    except Exception as e:
        logger.error(f'❌ 数据表检查异常: {e}')
    
    logger.info('=' * 60)
    logger.info('报告管理功能测试完成')
    logger.info('=' * 60)

if __name__ == '__main__':
    test_reports_management()
