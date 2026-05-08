#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据库完整初始化脚本

统一初始化所有数据库表并插入测试数据。
包含用户权限、患者管理、影像管理、诊断报告、系统配置等所有模块。

作者: XieHe Medical System
创建时间: 2025-09-24
"""

import sys
import os
import io

# 设置标准输出编码为UTF-8（解决Windows下emoji显示问题）
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')
import subprocess
from datetime import datetime
from env_loader import load_project_env

# 添加项目根目录到Python路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# 加载项目拆分后的 dotenv 文件
load_project_env()

# 从环境变量读取数据库配置（支持 Docker 环境变量）
MYSQL_HOST = os.getenv("DB_HOST", os.getenv("MYSQL_HOST", "127.0.0.1"))
MYSQL_PORT = int(os.getenv("DB_PORT", os.getenv("MYSQL_PORT", "3306")))
MYSQL_USER = os.getenv("DB_USER", os.getenv("MYSQL_USER", "root"))
MYSQL_PASSWORD = os.getenv("DB_PASSWORD", os.getenv("MYSQL_PASSWORD", "123456"))
MYSQL_DATABASE = os.getenv("DB_NAME", os.getenv("MYSQL_DATABASE", "medical_imaging_system"))

# 构建数据库URL
DATABASE_URL = (
    f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}"
    f"@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}"
    f"?charset=utf8mb4"
)

def run_script(script_name, description):
    """运行初始化脚本"""
    print(f"\n🚀 开始执行: {description}")
    print("=" * 60)

    try:
        # 运行脚本
        result = subprocess.run(
            [sys.executable, script_name],
            cwd=os.path.dirname(os.path.abspath(__file__)),
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace',  # 替换无法解码的字符
            timeout=120  # 2分钟超时
        )
        
        if result.returncode == 0:
            print(f"✅ {description} 执行成功!")
            # 显示脚本输出的关键信息
            lines = result.stdout.split('\n')
            for line in lines:
                if any(keyword in line for keyword in ['🎉', '📊', '✅', '❌', '创建', '初始化完成']):
                    print(f"   {line}")
            return True
        else:
            print(f"❌ {description} 执行失败!")
            print(f"错误信息: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print(f"❌ {description} 执行超时!")
        return False
    except Exception as e:
        print(f"❌ {description} 执行异常: {str(e)}")
        return False


def check_database_connection():
    """检查数据库连接"""
    print("🔍 检查数据库连接...")

    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(DATABASE_URL)
        
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1 as test"))
            test_value = result.fetchone()[0]
            
            if test_value == 1:
                print("✅ 数据库连接正常!")
                return True
            else:
                print("❌ 数据库连接测试失败!")
                return False
                
    except Exception as e:
        print(f"❌ 数据库连接失败: {str(e)}")
        return False


def get_table_counts():
    """获取各表的记录数统计"""
    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(DATABASE_URL)
        
        tables = [
            ('departments', '部门'),
            ('roles', '角色'),
            ('permissions', '权限'),
            ('users', '用户'),
            ('teams', '团队'),
            ('team_memberships', '团队成员'),
            ('team_join_requests', '加入申请'),
            ('team_invitations', '团队邀请'),
            ('patients', '患者'),
            ('patient_visits', '就诊记录'),
            ('patient_allergies', '过敏史'),
            ('patient_medical_history', '病史'),
            ('image_files', '影像文件'),
            ('image_annotations', '影像标注'),
            ('ai_tasks', 'AI任务'),
            ('report_templates', '报告模板'),
            ('diagnostic_reports', '诊断报告'),
            ('report_findings', '报告所见'),
            ('report_revisions', '修订历史'),
            ('system_configs', '系统配置'),
            ('system_logs', '系统日志'),
            ('notifications', '通知消息'),
            ('system_monitors', '监控记录'),
            ('system_alerts', '系统告警')
        ]
        
        print("\n📊 数据库表统计:")
        print("-" * 40)
        
        total_records = 0
        
        with engine.connect() as conn:
            for table_name, table_desc in tables:
                try:
                    result = conn.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    count = result.fetchone()[0]
                    print(f"   {table_desc:12} ({table_name:20}): {count:4d} 条记录")
                    total_records += count
                except Exception as e:
                    print(f"   {table_desc:12} ({table_name:20}): 表不存在")
        
        print("-" * 40)
        print(f"   {'总计':12} {'':20}: {total_records:4d} 条记录")
        
        return total_records
        
    except Exception as e:
        print(f"❌ 获取表统计失败: {str(e)}")
        return 0


def clean_database():
    """清理数据库中的现有数据"""
    print("🧹 清理数据库现有数据...")

    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(DATABASE_URL)

        # 需要清理的表（按依赖关系倒序）
        tables_to_clean = [
            'team_invitations',
            'team_join_requests',
            'team_memberships',
            'teams',
            'user_roles',
            'role_permissions',
            'report_revisions',
            'report_findings',
            'diagnostic_reports',
            'report_templates',
            'ai_tasks',
            'image_annotations',
            'image_files',
            'patient_medical_history',
            'patient_allergies',
            'patient_visits',
            'patients',
            'system_alerts',
            'system_monitors',
            'notifications',
            'system_logs',
            'system_configs',
            'users',
            'permissions',
            'roles',
            'departments'
        ]

        with engine.begin() as conn:
            # 禁用外键检查
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))

            for table in tables_to_clean:
                try:
                    result = conn.execute(text(f"DELETE FROM {table}"))
                    print(f"   清理表 {table}: {result.rowcount} 条记录")
                except Exception as e:
                    # 表不存在时忽略错误
                    if "doesn't exist" not in str(e):
                        print(f"   清理表 {table} 失败: {str(e)}")

            # 重新启用外键检查
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))

        print("✅ 数据库清理完成!")
        return True

    except Exception as e:
        print(f"❌ 数据库清理失败: {str(e)}")
        return False


def main():
    """主函数"""
    print("🏥 协和医疗影像诊断系统 - 数据库完整初始化")
    print("=" * 60)
    print(f"开始时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 检查数据库连接
    if not check_database_connection():
        print("\n❌ 数据库连接失败，请检查数据库配置!")
        return False

    # 清理现有数据
    if not clean_database():
        print("\n❌ 数据库清理失败!")
        return False
    
    # 初始化脚本列表
    init_scripts = [
        ("init_user_tables.py", "用户权限表初始化"),
        ("init_patient_tables.py", "患者管理表初始化"),
        ("init_image_tables.py", "影像管理表初始化"),
        ("init_report_tables.py", "诊断报告表初始化"),
        ("init_system_tables.py", "系统配置表初始化")
    ]
    
    success_count = 0
    total_count = len(init_scripts)
    
    # 依次执行初始化脚本
    for script_name, description in init_scripts:
        if run_script(script_name, description):
            success_count += 1
        else:
            print(f"\n❌ {description} 失败，停止后续初始化!")
            break
    
    print("\n" + "=" * 60)
    print("🎯 数据库初始化完成!")
    print("=" * 60)
    
    # 显示执行结果
    if success_count == total_count:
        print("✅ 所有模块初始化成功!")
        
        # 获取表统计
        total_records = get_table_counts()
        
        print(f"\n🎉 数据库初始化完全成功!")
        print(f"📊 共创建 {len(init_scripts)} 个模块，{total_records} 条测试数据")
        print(f"⏰ 完成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        print("\n🚀 系统已准备就绪，可以开始后端API开发!")
        print("\n📋 下一步建议:")
        print("   1. 启动FastAPI服务器")
        print("   2. 测试API接口")
        print("   3. 集成前端应用")
        print("   4. 进行端到端测试")
        
        return True
    else:
        print(f"❌ 初始化失败! ({success_count}/{total_count} 个模块成功)")
        print("请检查错误信息并重新运行相应的初始化脚本。")
        return False


if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
