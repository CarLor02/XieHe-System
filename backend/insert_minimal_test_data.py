#!/usr/bin/env python3
"""
最简化的测试数据插入脚本 - 不涉及复杂关系
"""

import sys
import os
from datetime import datetime, date, timedelta

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.core.database import get_db

def insert_minimal_test_data():
    """插入最简化的测试数据"""
    db = next(get_db())
    
    try:
        print("🏥 XieHe医疗影像诊断系统 - 插入最简化测试数据")
        print("=" * 60)
        
        # 1. 插入用户数据
        print("📝 插入用户数据...")
        user_sql = """
        INSERT INTO users (username, email, password_hash, salt, real_name, status, is_superuser, is_verified, created_at)
        VALUES ('admin', 'admin@xiehe.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5u', 'salt123', '系统管理员', 'active', 1, 1, NOW())
        """
        db.execute(text(user_sql))
        db.commit()
        print("✅ 用户数据插入成功")
        
        # 2. 插入患者数据
        print("📝 插入患者数据...")
        patients_sql = """
        INSERT INTO patients (patient_id, name, gender, birth_date, phone, email, address, emergency_contact_name, emergency_contact_phone, status, created_at, created_by)
        VALUES 
        ('P001', '张三', 'MALE', '1980-05-15', '13800138001', 'zhangsan@example.com', '北京市朝阳区建国路1号', '李四', '13800138002', 'ACTIVE', NOW(), 1),
        ('P002', '李四', 'FEMALE', '1975-08-20', '13800138003', 'lisi@example.com', '上海市浦东新区陆家嘴1号', '王五', '13800138004', 'ACTIVE', NOW(), 1),
        ('P003', '王五', 'MALE', '1990-12-10', '13800138005', 'wangwu@example.com', '广州市天河区珠江新城1号', '赵六', '13800138006', 'ACTIVE', NOW(), 1),
        ('P004', '赵六', 'FEMALE', '1985-03-25', '13800138007', 'zhaoliu@example.com', '深圳市南山区科技园1号', '孙七', '13800138008', 'ACTIVE', NOW(), 1),
        ('P005', '孙七', 'MALE', '1970-11-05', '13800138009', 'sunqi@example.com', '杭州市西湖区文三路1号', '周八', '13800138010', 'ACTIVE', NOW(), 1)
        """
        db.execute(text(patients_sql))
        db.commit()
        print("✅ 患者数据插入成功")
        
        # 3. 插入检查数据
        print("📝 插入检查数据...")
        studies_sql = """
        INSERT INTO studies (patient_id, study_instance_uid, study_id, accession_number, study_description, modality, body_part, study_date, referring_physician, status, created_at)
        VALUES 
        (1, '1.2.3.4.5.6.7.8.9.1', 'STU001', 'ACC001', '胸部正位X光检查', 'XR', 'CHEST', CURDATE() - INTERVAL 2 DAY, '张医生', 'COMPLETED', NOW()),
        (2, '1.2.3.4.5.6.7.8.9.2', 'STU002', 'ACC002', '头部CT扫描', 'CT', 'HEAD', CURDATE() - INTERVAL 1 DAY, '李医生', 'COMPLETED', NOW()),
        (3, '1.2.3.4.5.6.7.8.9.3', 'STU003', 'ACC003', '膝关节MRI检查', 'MR', 'EXTREMITY', CURDATE(), '王医生', 'IN_PROGRESS', NOW()),
        (4, '1.2.3.4.5.6.7.8.9.4', 'STU004', 'ACC004', '腰椎正侧位X光检查', 'XR', 'SPINE', CURDATE(), '赵医生', 'COMPLETED', NOW()),
        (5, '1.2.3.4.5.6.7.8.9.5', 'STU005', 'ACC005', '心脏超声检查', 'US', 'CHEST', CURDATE(), '孙医生', 'IN_PROGRESS', NOW())
        """
        db.execute(text(studies_sql))
        db.commit()
        print("✅ 检查数据插入成功")
        
        # 4. 验证数据
        print("\n📊 验证插入的数据...")
        
        # 检查患者数量
        result = db.execute(text("SELECT COUNT(*) FROM patients"))
        patient_count = result.scalar()
        print(f"  患者数量: {patient_count}")
        
        # 检查检查数量
        result = db.execute(text("SELECT COUNT(*) FROM studies"))
        study_count = result.scalar()
        print(f"  检查数量: {study_count}")
        
        # 显示一些样本数据
        print("\n📋 样本数据:")
        result = db.execute(text("SELECT patient_id, name, gender FROM patients LIMIT 3"))
        for row in result:
            print(f"  患者: {row[0]} - {row[1]} ({row[2]})")
            
        result = db.execute(text("SELECT study_id, study_description, modality, status FROM studies LIMIT 3"))
        for row in result:
            print(f"  检查: {row[0]} - {row[1]} ({row[2]}, {row[3]})")
        
        print("\n🎉 最简化测试数据插入完成！")
        
    except Exception as e:
        print(f"❌ 插入测试数据时发生错误: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    insert_minimal_test_data()
