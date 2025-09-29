#!/usr/bin/env python3
"""
完整的数据库创建脚本 - 一键部署所有表结构和初始数据
"""

import sys
import os
from sqlalchemy import text

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, sync_engine, Base

def import_all_models():
    """导入所有模型以确保表结构被正确注册"""
    print("📦 导入所有数据模型...")

    # 导入所有模型
    from app.models.patient import Patient, PatientVisit, PatientAllergy, PatientMedicalHistory
    from app.models.image import Study, Series, Instance, ImageAnnotation, AITask
    from app.models.report import ReportTemplate, DiagnosticReport, ReportFinding, ReportRevision
    from app.models.user import User, Role, Permission, Department
    from app.models.system import SystemConfig, SystemLog, SystemMonitor, SystemAlert, Notification

    # 验证模型导入
    models = [
        Patient, PatientVisit, PatientAllergy, PatientMedicalHistory,
        Study, Series, Instance, ImageAnnotation, AITask,
        ReportTemplate, DiagnosticReport, ReportFinding, ReportRevision,
        User, Role, Permission, Department,
        SystemConfig, SystemLog, SystemMonitor, SystemAlert, Notification
    ]

    print(f"  导入了 {len(models)} 个模型")
    for model in models:
        if hasattr(model, '__tablename__'):
            print(f"    - {model.__name__} -> {model.__tablename__}")

    print("✅ 所有模型导入完成")
    return True

def drop_all_tables():
    """删除所有现有表"""
    print("🗑️  删除现有表...")
    
    db = next(get_db())
    
    try:
        # 禁用外键检查
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        
        # 获取所有表名
        result = db.execute(text("SHOW TABLES"))
        tables = [row[0] for row in result.fetchall()]
        
        if tables:
            print(f"  发现 {len(tables)} 个现有表")
            # 删除所有表
            for table in tables:
                print(f"  删除表: {table}")
                db.execute(text(f"DROP TABLE IF EXISTS {table}"))
        else:
            print("  没有发现现有表")
        
        # 重新启用外键检查
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        
        db.commit()
        print("✅ 所有表删除完成")
        
    except Exception as e:
        print(f"❌ 删除表时发生错误: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def create_all_tables():
    """创建所有表结构"""
    print("🏗️  创建新表结构...")
    
    try:
        # 创建所有表
        Base.metadata.create_all(bind=sync_engine)
        print("✅ 所有表创建完成")
        
        # 验证表创建
        db = next(get_db())
        try:
            result = db.execute(text("SHOW TABLES"))
            tables = [row[0] for row in result.fetchall()]
            print(f"\n📊 创建的表 ({len(tables)}个):")
            for table in sorted(tables):
                print(f"  - {table}")
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ 创建表时发生错误: {e}")
        raise

def insert_initial_data():
    """插入初始数据"""
    print("\n📝 插入初始数据...")
    
    db = next(get_db())
    
    try:
        # 1. 创建默认管理员用户
        print("  创建默认管理员用户...")
        user_sql = """
        INSERT INTO users (username, email, password_hash, salt, real_name, status, is_superuser, is_verified, created_at)
        VALUES ('admin', 'admin@xiehe.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5u', 'salt123', '系统管理员', 'active', 1, 1, NOW())
        ON DUPLICATE KEY UPDATE username=username
        """
        db.execute(text(user_sql))
        
        # 2. 创建默认角色
        print("  创建默认角色...")
        roles_sql = """
        INSERT INTO roles (code, name, description, status, is_system, created_at) VALUES
        ('admin', '系统管理员', '拥有所有权限的系统管理员角色', 'active', 1, NOW()),
        ('doctor', '医生', '医生角色，可以查看和编辑患者信息、影像和报告', 'active', 0, NOW()),
        ('radiologist', '影像科医生', '影像科医生角色，专门负责影像诊断和报告', 'active', 0, NOW()),
        ('technician', '技师', '技师角色，负责设备操作和影像采集', 'active', 0, NOW())
        ON DUPLICATE KEY UPDATE code=code
        """
        db.execute(text(roles_sql))
        
        # 3. 创建基本权限
        print("  创建基本权限...")
        permissions_sql = """
        INSERT INTO permissions (code, name, description, module, resource, action, status, created_at) VALUES
        ('patient.read', '查看患者', '查看患者信息', 'patient', 'patient', 'read', 'active', NOW()),
        ('patient.create', '创建患者', '创建患者信息', 'patient', 'patient', 'create', 'active', NOW()),
        ('patient.update', '编辑患者', '编辑患者信息', 'patient', 'patient', 'update', 'active', NOW()),
        ('patient.delete', '删除患者', '删除患者信息', 'patient', 'patient', 'delete', 'active', NOW()),
        ('image.read', '查看影像', '查看医学影像', 'image', 'image', 'read', 'active', NOW()),
        ('image.upload', '上传影像', '上传医学影像', 'image', 'image', 'create', 'active', NOW()),
        ('image.update', '编辑影像', '编辑影像信息', 'image', 'image', 'update', 'active', NOW()),
        ('report.read', '查看报告', '查看诊断报告', 'report', 'report', 'read', 'active', NOW()),
        ('report.create', '创建报告', '创建诊断报告', 'report', 'report', 'create', 'active', NOW()),
        ('report.update', '编辑报告', '编辑诊断报告', 'report', 'report', 'update', 'active', NOW()),
        ('report.approve', '审核报告', '审核和批准报告', 'report', 'report', 'execute', 'active', NOW()),
        ('system.admin', '系统管理', '系统管理权限', 'system', 'system', 'execute', 'active', NOW())
        ON DUPLICATE KEY UPDATE code=code
        """
        db.execute(text(permissions_sql))
        
        # 4. 创建默认部门
        print("  创建默认部门...")
        departments_sql = """
        INSERT INTO departments (code, name, description, status, created_at) VALUES
        ('radiology', '放射科', '负责医学影像检查和诊断', 'active', NOW()),
        ('cardiology', '心内科', '心血管疾病诊疗科室', 'active', NOW()),
        ('orthopedics', '骨科', '骨骼肌肉系统疾病诊疗科室', 'active', NOW()),
        ('emergency', '急诊科', '急诊医疗服务科室', 'active', NOW())
        ON DUPLICATE KEY UPDATE code=code
        """
        db.execute(text(departments_sql))
        
        # 5. 创建系统配置（暂时跳过，因为system_configs表没有被创建）
        print("  跳过系统配置（表未创建）...")
        
        db.commit()
        print("✅ 初始数据插入完成")
        
    except Exception as e:
        print(f"❌ 插入初始数据时发生错误: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def verify_database():
    """验证数据库创建结果"""
    print("\n🔍 验证数据库创建结果...")
    
    db = next(get_db())
    
    try:
        # 检查表数量
        result = db.execute(text("SHOW TABLES"))
        table_count = len(result.fetchall())
        print(f"  表数量: {table_count}")
        
        # 检查用户数量
        result = db.execute(text("SELECT COUNT(*) FROM users"))
        user_count = result.scalar()
        print(f"  用户数量: {user_count}")
        
        # 检查角色数量
        result = db.execute(text("SELECT COUNT(*) FROM roles"))
        role_count = result.scalar()
        print(f"  角色数量: {role_count}")
        
        # 检查权限数量
        result = db.execute(text("SELECT COUNT(*) FROM permissions"))
        permission_count = result.scalar()
        print(f"  权限数量: {permission_count}")
        
        # 检查部门数量
        result = db.execute(text("SELECT COUNT(*) FROM departments"))
        dept_count = result.scalar()
        print(f"  部门数量: {dept_count}")
        
        print("✅ 数据库验证完成")
        
    except Exception as e:
        print(f"❌ 验证数据库时发生错误: {e}")
    finally:
        db.close()

def main():
    """主函数"""
    print("🏥 XieHe医疗影像诊断系统 - 完整数据库创建")
    print("=" * 60)
    
    try:
        # 1. 导入所有模型
        import_all_models()
        
        # 2. 删除现有表
        drop_all_tables()
        
        # 3. 创建所有表
        create_all_tables()
        
        # 4. 插入初始数据
        insert_initial_data()
        
        # 5. 验证结果
        verify_database()
        
        print("\n🎉 数据库创建完成！")
        print("\n📋 默认登录信息:")
        print("  用户名: admin")
        print("  密码: secret")
        
    except Exception as e:
        print(f"\n❌ 数据库创建失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
