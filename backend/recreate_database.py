#!/usr/bin/env python3
"""
重新创建数据库表结构脚本
"""

import sys
import os
from sqlalchemy import text

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db, sync_engine, Base
# 导入所有模型以确保表结构被正确注册
from app.models.patient import Patient, PatientVisit, PatientAllergy, PatientMedicalHistory
from app.models.image import Study, Series, Instance, ImageAnnotation, AITask
from app.models.report import ReportTemplate, DiagnosticReport, ReportFinding, ReportRevision
from app.models.user import User, Role, Permission, Department
from app.models.system import SystemConfig, SystemLog, SystemMonitor, SystemAlert, Notification

def drop_all_tables():
    """删除所有表"""
    print("🗑️  删除现有表...")
    
    # 获取数据库连接
    db = next(get_db())
    
    try:
        # 禁用外键检查
        db.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
        
        # 获取所有表名
        result = db.execute(text("SHOW TABLES"))
        tables = [row[0] for row in result.fetchall()]
        
        # 删除所有表
        for table in tables:
            print(f"  删除表: {table}")
            db.execute(text(f"DROP TABLE IF EXISTS {table}"))
        
        # 重新启用外键检查
        db.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
        
        db.commit()
        print("✅ 所有表删除完成")
        
    except Exception as e:
        print(f"❌ 删除表时发生错误: {e}")
        db.rollback()
    finally:
        db.close()

def create_all_tables():
    """创建所有表"""
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

def insert_initial_data():
    """插入初始数据"""
    print("\n📝 插入初始数据...")

    db = next(get_db())

    try:
        # 使用SQL直接插入，避免模型关系问题
        print("  创建默认管理员用户...")
        user_sql = """
        INSERT INTO users (username, email, password_hash, salt, real_name, status, is_superuser, is_verified, created_at)
        VALUES ('admin', 'admin@xiehe.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5u', 'salt123', '系统管理员', 'active', 1, 1, NOW())
        ON DUPLICATE KEY UPDATE username=username
        """
        db.execute(text(user_sql))

        print("  创建默认角色...")
        role_sql = """
        INSERT INTO roles (code, name, description, status, is_system, created_at)
        VALUES ('admin', '系统管理员', '拥有所有权限的系统管理员角色', 'active', 1, NOW())
        ON DUPLICATE KEY UPDATE code=code
        """
        db.execute(text(role_sql))
        
        doctor_role = Role(
            name="doctor",
            display_name="医生",
            description="医生角色，可以查看和编辑患者信息、影像和报告",
            is_active=True
        )
        db.add(doctor_role)
        
        radiologist_role = Role(
            name="radiologist", 
            display_name="影像科医生",
            description="影像科医生角色，专门负责影像诊断和报告",
            is_active=True
        )
        db.add(radiologist_role)
        
        # 创建基本权限
        permissions = [
            Permission(name="patient:read", display_name="查看患者", description="查看患者信息"),
            Permission(name="patient:write", display_name="编辑患者", description="编辑患者信息"),
            Permission(name="patient:delete", display_name="删除患者", description="删除患者信息"),
            Permission(name="image:read", display_name="查看影像", description="查看医学影像"),
            Permission(name="image:write", display_name="编辑影像", description="编辑影像信息"),
            Permission(name="image:upload", display_name="上传影像", description="上传医学影像"),
            Permission(name="report:read", display_name="查看报告", description="查看诊断报告"),
            Permission(name="report:write", display_name="编辑报告", description="编辑诊断报告"),
            Permission(name="report:approve", display_name="审核报告", description="审核和批准报告"),
            Permission(name="system:admin", display_name="系统管理", description="系统管理权限"),
        ]
        
        for perm in permissions:
            db.add(perm)
        
        # 创建默认报告模板
        chest_template = ReportTemplate(
            template_name="胸部X光检查报告",
            modality="CR",
            body_part="CHEST",
            template_type="structured",
            template_content={
                "sections": [
                    {"name": "临床病史", "type": "text", "required": False},
                    {"name": "检查技术", "type": "text", "required": True},
                    {"name": "检查所见", "type": "text", "required": True},
                    {"name": "诊断意见", "type": "text", "required": True},
                    {"name": "建议", "type": "text", "required": False}
                ]
            },
            is_active=True,
            created_by=1
        )
        db.add(chest_template)
        
        ct_template = ReportTemplate(
            template_name="头部CT检查报告",
            modality="CT",
            body_part="HEAD",
            template_type="structured",
            template_content={
                "sections": [
                    {"name": "临床病史", "type": "text", "required": False},
                    {"name": "检查技术", "type": "text", "required": True},
                    {"name": "检查所见", "type": "text", "required": True},
                    {"name": "诊断意见", "type": "text", "required": True},
                    {"name": "建议", "type": "text", "required": False}
                ]
            },
            is_active=True,
            created_by=1
        )
        db.add(ct_template)
        
        # 创建系统配置
        configs = [
            SystemConfig(
                config_key="system.name",
                config_value="XieHe医疗影像诊断系统",
                description="系统名称",
                is_active=True
            ),
            SystemConfig(
                config_key="system.version",
                config_value="1.0.0",
                description="系统版本",
                is_active=True
            ),
            SystemConfig(
                config_key="upload.max_file_size",
                config_value="100000000",
                description="最大文件上传大小(字节)",
                is_active=True
            ),
            SystemConfig(
                config_key="ai.enabled",
                config_value="true",
                description="是否启用AI诊断",
                is_active=True
            )
        ]
        
        for config in configs:
            db.add(config)
        
        db.commit()
        print("✅ 初始数据插入完成")
        
        # 验证数据
        user_count = db.query(User).count()
        role_count = db.query(Role).count()
        permission_count = db.query(Permission).count()
        template_count = db.query(ReportTemplate).count()
        config_count = db.query(SystemConfig).count()
        
        print(f"\n📊 初始数据统计:")
        print(f"  用户数量: {user_count}")
        print(f"  角色数量: {role_count}")
        print(f"  权限数量: {permission_count}")
        print(f"  报告模板数量: {template_count}")
        print(f"  系统配置数量: {config_count}")
        
    except Exception as e:
        print(f"❌ 插入初始数据时发生错误: {e}")
        db.rollback()
    finally:
        db.close()

def main():
    """主函数"""
    print("🏥 XieHe医疗影像诊断系统 - 数据库重建")
    print("=" * 50)
    
    # 确认操作
    confirm = input("⚠️  这将删除所有现有数据！是否继续？(y/N): ")
    if confirm.lower() != 'y':
        print("❌ 操作已取消")
        return
    
    try:
        # 1. 删除所有表
        drop_all_tables()
        
        # 2. 创建新表结构
        create_all_tables()
        
        # 3. 插入初始数据
        insert_initial_data()
        
        print("\n🎉 数据库重建完成！")
        print("\n📋 默认登录信息:")
        print("  用户名: admin")
        print("  密码: secret")
        
    except Exception as e:
        print(f"\n❌ 数据库重建失败: {e}")

if __name__ == "__main__":
    main()
