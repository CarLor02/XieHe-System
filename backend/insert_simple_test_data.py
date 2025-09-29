#!/usr/bin/env python3
"""
简化的测试数据插入脚本
"""

import sys
import os
from datetime import datetime, date, timedelta

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.patient import Patient
from app.models.image import Study
from app.models.user import User, Role, Permission

def insert_test_data():
    """插入测试数据"""
    db = next(get_db())
    
    try:
        print("🏥 XieHe医疗影像诊断系统 - 插入测试数据")
        print("=" * 50)

        # 1. 先创建一个默认用户
        print("📝 创建默认用户...")
        admin_user = User(
            username="admin",
            email="admin@xiehe.com",
            password_hash="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3bp.Gm.F5u",  # secret
            salt="salt123",
            real_name="系统管理员",
            status="active",
            is_superuser=True,
            is_verified=True
        )
        db.add(admin_user)
        db.commit()
        print("✅ 默认用户创建成功")

        # 2. 插入患者数据
        print("📝 插入患者数据...")
        patients_data = [
            {
                "patient_id": "P001",
                "name": "张三",
                "gender": "MALE",
                "birth_date": date(1980, 5, 15),
                "phone": "13800138001",
                "email": "zhangsan@example.com",
                "address": "北京市朝阳区建国路1号",
                "emergency_contact_name": "李四",
                "emergency_contact_phone": "13800138002",
                "status": "ACTIVE",
                "created_by": admin_user.id
            },
            {
                "patient_id": "P002", 
                "name": "李四",
                "gender": "FEMALE",
                "birth_date": date(1975, 8, 20),
                "phone": "13800138003",
                "email": "lisi@example.com",
                "address": "上海市浦东新区陆家嘴1号",
                "emergency_contact_name": "王五",
                "emergency_contact_phone": "13800138004",
                "status": "ACTIVE",
                "created_by": admin_user.id
            },
            {
                "patient_id": "P003",
                "name": "王五",
                "gender": "MALE", 
                "birth_date": date(1990, 12, 10),
                "phone": "13800138005",
                "email": "wangwu@example.com",
                "address": "广州市天河区珠江新城1号",
                "emergency_contact_name": "赵六",
                "emergency_contact_phone": "13800138006",
                "status": "ACTIVE",
                "created_by": admin_user.id
            }
        ]
        
        patients = []
        for patient_data in patients_data:
            patient = Patient(**patient_data)
            db.add(patient)
            patients.append(patient)
        
        db.commit()
        print(f"✅ 成功插入 {len(patients)} 个患者")

        # 3. 插入检查数据
        print("📝 插入检查数据...")
        studies_data = [
            {
                "patient_id": patients[0].id,
                "study_instance_uid": "1.2.3.4.5.6.7.8.9.1",
                "study_id": "STU001",
                "accession_number": "ACC001",
                "study_description": "胸部正位X光检查",
                "modality": "XR",
                "body_part": "CHEST",
                "study_date": (datetime.now() - timedelta(days=2)).date(),
                "referring_physician": "张医生",
                "status": "COMPLETED"
            },
            {
                "patient_id": patients[1].id,
                "study_instance_uid": "1.2.3.4.5.6.7.8.9.2",
                "study_id": "STU002",
                "accession_number": "ACC002",
                "study_description": "头部CT扫描",
                "modality": "CT",
                "body_part": "HEAD",
                "study_date": (datetime.now() - timedelta(days=1)).date(),
                "referring_physician": "李医生",
                "status": "COMPLETED"
            },
            {
                "patient_id": patients[2].id,
                "study_instance_uid": "1.2.3.4.5.6.7.8.9.3",
                "study_id": "STU003",
                "accession_number": "ACC003",
                "study_description": "膝关节MRI检查",
                "modality": "MR",
                "body_part": "EXTREMITY",
                "study_date": datetime.now().date(),
                "referring_physician": "王医生",
                "status": "IN_PROGRESS"
            }
        ]
        
        studies = []
        for study_data in studies_data:
            study = Study(**study_data)
            db.add(study)
            studies.append(study)
        
        db.commit()
        print(f"✅ 成功插入 {len(studies)} 个检查")
        
        print("\n🎉 测试数据插入完成！")
        print("\n📊 数据统计:")
        print(f"  患者数量: {len(patients)}")
        print(f"  检查数量: {len(studies)}")
        
    except Exception as e:
        print(f"❌ 插入测试数据时发生错误: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    insert_test_data()
