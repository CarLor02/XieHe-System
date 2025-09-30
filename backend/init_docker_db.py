#!/usr/bin/env python3
"""
Docker环境数据库初始化脚本
在Docker容器启动后运行，创建表结构并插入测试数据
"""

import time
import sys
import os

# 添加backend路径到Python路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

def wait_for_db():
    """等待数据库就绪"""
    import pymysql
    
    max_retries = 30
    retry_interval = 2
    
    for i in range(max_retries):
        try:
            connection = pymysql.connect(
                host=os.getenv('DATABASE_HOST', 'mysql'),
                port=int(os.getenv('DATABASE_PORT', 3306)),
                user=os.getenv('DATABASE_USER', 'medical_user'),
                password=os.getenv('DATABASE_PASSWORD', 'medical_password_2024'),
                database=os.getenv('DATABASE_NAME', 'medical_system')
            )
            connection.close()
            print("✅ 数据库连接成功")
            return True
        except Exception as e:
            print(f"⏳ 等待数据库就绪... ({i+1}/{max_retries}): {e}")
            time.sleep(retry_interval)
    
    print("❌ 数据库连接失败")
    return False

def create_tables():
    """创建数据库表"""
    from app.core.database import engine, Base
    from app.models import user, patient, study, report
    
    print("📋 创建数据库表...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ 数据库表创建成功")
        return True
    except Exception as e:
        print(f"❌ 数据库表创建失败: {e}")
        return False

def insert_test_data():
    """插入测试数据"""
    from app.core.database import get_db
    from app.core.security import get_password_hash
    from app.models.user import User
    from app.models.patient import Patient
    from app.models.study import Study
    from datetime import datetime, date
    
    print("📝 插入测试数据...")
    
    db = next(get_db())
    
    try:
        # 检查是否已有数据
        existing_user = db.query(User).filter(User.username == 'admin').first()
        if existing_user:
            print("ℹ️  测试数据已存在，跳过插入")
            return True
        
        # 创建管理员用户
        admin_user = User(
            username='admin',
            email='admin@xiehe.com',
            full_name='系统管理员',
            hashed_password=get_password_hash('secret'),
            role='admin',
            is_active=True,
            is_superuser=True,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(admin_user)
        
        # 创建测试患者
        for i in range(1, 11):
            patient = Patient(
                patient_id=f'P{2025000 + i}',
                name=f'测试患者{i}',
                gender='M' if i % 2 == 0 else 'F',
                birth_date=date(1980 + i, 1, 1),
                phone=f'138{i:08d}',
                id_card=f'11010119{80+i}0101{i:04d}',
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
            db.add(patient)
        
        db.commit()
        print("✅ 测试数据插入成功")
        return True
        
    except Exception as e:
        db.rollback()
        print(f"❌ 测试数据插入失败: {e}")
        return False
    finally:
        db.close()

def main():
    """主函数"""
    print("🚀 开始初始化Docker数据库...")
    
    # 等待数据库就绪
    if not wait_for_db():
        sys.exit(1)
    
    # 创建表
    if not create_tables():
        sys.exit(1)
    
    # 插入测试数据
    if not insert_test_data():
        sys.exit(1)
    
    print("🎉 Docker数据库初始化完成！")

if __name__ == '__main__':
    main()

