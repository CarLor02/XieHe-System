#!/usr/bin/env python3
"""
插入测试患者数据
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.patient import Patient, GenderEnum, PatientStatusEnum
from app.models.image import Study, StudyStatusEnum, ModalityEnum, BodyPartEnum
from datetime import datetime, date
import uuid

def create_test_patients():
    """创建测试患者数据"""
    db = next(get_db())
    try:
        print("🏥 开始创建测试患者数据...")
        
        # 创建5个测试患者
        patients_data = [
            {
                'patient_id': 'P202401001', 
                'name': '李明', 
                'gender': GenderEnum.MALE, 
                'birth_date': date(1980, 5, 15), 
                'phone': '13800138001',
                'address': '北京市朝阳区建国路1号'
            },
            {
                'patient_id': 'P202401002', 
                'name': '王芳', 
                'gender': GenderEnum.FEMALE, 
                'birth_date': date(1975, 8, 22), 
                'phone': '13800138002',
                'address': '上海市浦东新区陆家嘴路2号'
            },
            {
                'patient_id': 'P202401003', 
                'name': '张伟', 
                'gender': GenderEnum.MALE, 
                'birth_date': date(1990, 3, 10), 
                'phone': '13800138003',
                'address': '广州市天河区珠江路3号'
            },
            {
                'patient_id': 'P202401004', 
                'name': '赵敏', 
                'gender': GenderEnum.FEMALE, 
                'birth_date': date(1985, 12, 5), 
                'phone': '13800138004',
                'address': '深圳市南山区科技路4号'
            },
            {
                'patient_id': 'P202401005', 
                'name': '刘涛', 
                'gender': GenderEnum.MALE, 
                'birth_date': date(1978, 7, 18), 
                'phone': '13800138005',
                'address': '杭州市西湖区文三路5号'
            }
        ]
        
        patient_ids = []
        for i, data in enumerate(patients_data):
            # 检查患者是否已存在
            existing = db.query(Patient).filter(Patient.patient_id == data['patient_id']).first()
            if existing:
                print(f"  患者 {data['name']} 已存在，跳过")
                patient_ids.append(existing.id)
                continue
                
            patient = Patient(
                patient_id=data['patient_id'],
                name=data['name'],
                gender=data['gender'],
                birth_date=data['birth_date'],
                phone=data['phone'],
                address=data['address'],
                status=PatientStatusEnum.ACTIVE,
                is_deleted=False,
                created_at=datetime.now(),
                created_by=None,
                updated_by=None,
                deleted_by=None
            )
            db.add(patient)
            db.flush()
            patient_ids.append(patient.id)
            print(f"  ✅ 创建患者: {data['name']} (ID: {patient.id})")
        
        # 创建5个测试影像检查
        studies_data = [
            {'study_instance_uid': f'1.2.3.4.5.{i}', 'study_id': f'ST{i:03d}', 'study_description': f'胸部X光检查{i}', 'modality': ModalityEnum.XR}
            for i in range(1, 6)
        ]
        
        for i, data in enumerate(studies_data):
            # 检查检查是否已存在
            existing = db.query(Study).filter(Study.study_instance_uid == data['study_instance_uid']).first()
            if existing:
                print(f"  影像检查 {data['study_description']} 已存在，跳过")
                continue
                
            study = Study(
                study_instance_uid=data['study_instance_uid'],
                study_id=data['study_id'],
                patient_id=patient_ids[i],
                study_date=date.today(),
                study_description=data['study_description'],
                modality=data['modality'],
                body_part=BodyPartEnum.CHEST,
                status=StudyStatusEnum.COMPLETED,
                created_at=datetime.now(),
                created_by=None,
                updated_by=None,
                deleted_by=None
            )
            db.add(study)
            print(f"  ✅ 创建影像检查: {data['study_description']} (患者ID: {patient_ids[i]})")
        
        db.commit()
        print("🎉 测试数据创建成功")
        
        # 验证数据
        patient_count = db.query(Patient).filter(Patient.is_deleted == False).count()
        study_count = db.query(Study).count()
        print(f"📊 数据统计:")
        print(f"  患者数量: {patient_count}")
        print(f"  影像检查数量: {study_count}")
        
    except Exception as e:
        print(f"❌ 创建测试数据失败: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_patients()
