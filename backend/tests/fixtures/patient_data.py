#!/usr/bin/env python3
"""
测试患者数据夹具

提供测试用的患者数据，可用于测试和开发

使用方法:
    # 作为 pytest fixture
    from tests.fixtures.patient_data import create_test_patients
    
    # 直接运行插入数据
    cd backend
    python tests/fixtures/patient_data.py

@author XieHe Medical System
@created 2025-10-14
"""

import sys
import os
from datetime import datetime, date
import uuid

# 添加项目根目录到Python路径
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.core.database import get_db
from app.models.patient import Patient, GenderEnum, PatientStatusEnum
from app.models.image import ModalityEnum, BodyPartEnum
from app.models.image_file import ImageFile, ImageFileStatusEnum


# 测试患者数据
TEST_PATIENTS_DATA = [
    {
        'patient_id': 'P202401001',
        'name': '李明',
        'gender': GenderEnum.MALE,
        'birth_date': date(1980, 5, 15),
        'phone': '13800138001',
        'email': 'liming@test.com',
        'address': '北京市朝阳区建国路1号',
        'emergency_contact_name': '李华',
        'emergency_contact_phone': '13800138002',
        'status': PatientStatusEnum.ACTIVE
    },
    {
        'patient_id': 'P202401002',
        'name': '王芳',
        'gender': GenderEnum.FEMALE,
        'birth_date': date(1975, 8, 22),
        'phone': '13800138003',
        'email': 'wangfang@test.com',
        'address': '上海市浦东新区陆家嘴路2号',
        'emergency_contact_name': '王强',
        'emergency_contact_phone': '13800138004',
        'status': PatientStatusEnum.ACTIVE
    },
    {
        'patient_id': 'P202401003',
        'name': '张伟',
        'gender': GenderEnum.MALE,
        'birth_date': date(1990, 3, 10),
        'phone': '13800138005',
        'email': 'zhangwei@test.com',
        'address': '广州市天河区珠江路3号',
        'emergency_contact_name': '张丽',
        'emergency_contact_phone': '13800138006',
        'status': PatientStatusEnum.ACTIVE
    },
    {
        'patient_id': 'P202401004',
        'name': '赵敏',
        'gender': GenderEnum.FEMALE,
        'birth_date': date(1985, 12, 5),
        'phone': '13800138007',
        'email': 'zhaomin@test.com',
        'address': '深圳市南山区科技园4号',
        'emergency_contact_name': '赵刚',
        'emergency_contact_phone': '13800138008',
        'status': PatientStatusEnum.ACTIVE
    },
    {
        'patient_id': 'P202401005',
        'name': '刘洋',
        'gender': GenderEnum.MALE,
        'birth_date': date(1978, 7, 18),
        'phone': '13800138009',
        'email': 'liuyang@test.com',
        'address': '成都市武侯区天府大道5号',
        'emergency_contact_name': '刘梅',
        'emergency_contact_phone': '13800138010',
        'status': PatientStatusEnum.ACTIVE
    }
]


# 测试检查数据
TEST_STUDIES_DATA = [
    {
        'patient_id': 'P202401001',
        'study_instance_uid': f'1.2.840.{uuid.uuid4().int}',
        'study_id': 'S202401001',
        'study_date': date(2024, 1, 15),
        'study_time': '10:30:00',
        'modality': ModalityEnum.CT,
        'body_part': BodyPartEnum.CHEST,
        'study_description': '胸部CT平扫',
        'status': StudyStatusEnum.COMPLETED
    },
    {
        'patient_id': 'P202401002',
        'study_instance_uid': f'1.2.840.{uuid.uuid4().int}',
        'study_id': 'S202401002',
        'study_date': date(2024, 1, 16),
        'study_time': '14:20:00',
        'modality': ModalityEnum.MR,
        'body_part': BodyPartEnum.HEAD,
        'study_description': '头部MRI增强',
        'status': StudyStatusEnum.COMPLETED
    },
    {
        'patient_id': 'P202401003',
        'study_instance_uid': f'1.2.840.{uuid.uuid4().int}',
        'study_id': 'S202401003',
        'study_date': date(2024, 1, 17),
        'study_time': '09:15:00',
        'modality': ModalityEnum.XR,
        'body_part': BodyPartEnum.CHEST,
        'study_description': '胸部X光正位',
        'status': StudyStatusEnum.COMPLETED
    }
]


def create_test_patients(db=None):
    """
    创建测试患者数据
    
    Args:
        db: 数据库会话，如果为None则创建新会话
        
    Returns:
        list: 创建的患者对象列表
    """
    if db is None:
        db = next(get_db())
        should_close = True
    else:
        should_close = False
    
    try:
        print("🏥 开始创建测试患者数据...")
        
        patients = []
        for patient_data in TEST_PATIENTS_DATA:
            # 检查患者是否已存在
            existing = db.query(Patient).filter(
                Patient.patient_id == patient_data['patient_id']
            ).first()
            
            if existing:
                print(f"  ⏭️  患者 {patient_data['patient_id']} 已存在，跳过")
                patients.append(existing)
                continue
            
            # 创建新患者
            patient = Patient(**patient_data)
            db.add(patient)
            patients.append(patient)
            print(f"  ✅ 创建患者: {patient_data['patient_id']} - {patient_data['name']}")
        
        db.commit()
        print(f"✅ 成功创建 {len([p for p in patients if p.id])} 个测试患者")
        
        return patients
        
    except Exception as e:
        print(f"❌ 创建测试患者失败: {e}")
        db.rollback()
        raise
    finally:
        if should_close:
            db.close()


# 已废弃：create_test_studies 函数已移除
# Study/Series/Instance 模型已废弃，现在使用 ImageFile 模型


def main():
    """主函数 - 直接运行时插入测试数据"""
    print("=" * 60)
    print("测试患者数据插入工具")
    print("=" * 60)

    try:
        # 创建测试患者
        patients = create_test_patients()

        print("\n" + "=" * 60)
        print("✅ 测试数据插入完成！")
        print(f"   患者数量: {len(patients)}")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ 插入测试数据失败: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()

