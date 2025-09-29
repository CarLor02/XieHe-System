#!/usr/bin/env python3
"""
插入测试数据脚本
"""

import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import get_db
from app.models.patient import Patient
from app.models.image import Study, Series, Instance
from app.models.report import DiagnosticReport
from sqlalchemy.orm import Session

def insert_test_patients(db: Session):
    """插入测试患者数据"""
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
            "status": "ACTIVE"
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
            "status": "ACTIVE"
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
            "status": "ACTIVE"
        },
        {
            "patient_id": "P004",
            "name": "赵六",
            "gender": "FEMALE",
            "birth_date": date(1985, 3, 25),
            "phone": "13800138007",
            "email": "zhaoliu@example.com",
            "address": "深圳市南山区科技园1号",
            "emergency_contact_name": "孙七",
            "emergency_contact_phone": "13800138008",
            "status": "ACTIVE"
        },
        {
            "patient_id": "P005",
            "name": "孙七",
            "gender": "MALE",
            "birth_date": date(1970, 11, 5),
            "phone": "13800138009",
            "email": "sunqi@example.com",
            "address": "杭州市西湖区文三路1号",
            "emergency_contact_name": "周八",
            "emergency_contact_phone": "13800138010",
            "status": "ACTIVE"
        }
    ]
    
    for patient_data in patients_data:
        # 检查患者是否已存在
        existing = db.query(Patient).filter(Patient.patient_id == patient_data["patient_id"]).first()
        if not existing:
            patient = Patient(**patient_data)
            db.add(patient)
            print(f"添加患者: {patient_data['name']} ({patient_data['patient_id']})")
    
    db.commit()
    print(f"成功插入 {len(patients_data)} 个患者记录")

def insert_test_studies(db: Session):
    """插入测试检查数据"""
    # 获取患者ID
    patients = db.query(Patient).all()
    if not patients:
        print("没有患者数据，跳过检查数据插入")
        return

    studies_data = [
        {
            "patient_id": patients[0].id,
            "study_instance_uid": "1.2.3.4.5.6.7.8.9.1",
            "study_id": "STU001",
            "accession_number": "ACC001",
            "study_description": "胸部正位X光检查",
            "modality": "CR",
            "body_part": "CHEST",
            "study_date": (datetime.now() - timedelta(days=2)).date(),
            "referring_physician": "张医生",
            "status": "COMPLETED"
        },
        {
            "patient_id": patients[1].id,
            "study_uid": "1.2.3.4.5.6.7.8.9.2",
            "study_id": "STU002",
            "accession_number": "ACC002",
            "study_description": "头部CT扫描",
            "modality": "CT",
            "body_part": "HEAD",
            "study_date": datetime.now() - timedelta(days=1),
            "referring_physician": "李医生",
            "status": "completed"
        },
        {
            "patient_id": patients[2].id,
            "study_uid": "1.2.3.4.5.6.7.8.9.3",
            "study_id": "STU003",
            "accession_number": "ACC003",
            "study_description": "膝关节MRI检查",
            "modality": "MR",
            "body_part": "KNEE",
            "study_date": datetime.now() - timedelta(hours=12),
            "referring_physician": "王医生",
            "status": "completed"
        },
        {
            "patient_id": patients[3].id,
            "study_uid": "1.2.3.4.5.6.7.8.9.4",
            "study_id": "STU004",
            "accession_number": "ACC004",
            "study_description": "腰椎正侧位X光检查",
            "modality": "CR",
            "body_part": "SPINE",
            "study_date": datetime.now() - timedelta(hours=6),
            "referring_physician": "赵医生",
            "status": "in_progress"
        },
        {
            "patient_id": patients[4].id,
            "study_uid": "1.2.3.4.5.6.7.8.9.5",
            "study_id": "STU005",
            "accession_number": "ACC005",
            "study_description": "腹部超声检查",
            "modality": "US",
            "body_part": "ABDOMEN",
            "study_date": datetime.now() - timedelta(hours=3),
            "referring_physician": "孙医生",
            "status": "completed"
        }
    ]

    for study_data in studies_data:
        # 检查检查是否已存在
        existing = db.query(Study).filter(Study.study_id == study_data["study_id"]).first()
        if not existing:
            study = Study(**study_data)
            db.add(study)
            print(f"添加检查: {study_data['study_id']} - {study_data['study_description']}")

    db.commit()
    print(f"成功插入 {len(studies_data)} 个检查记录")

def insert_test_reports(db: Session):
    """插入测试报告数据"""
    # 获取检查数据
    studies = db.query(Study).all()
    if not studies:
        print("没有检查数据，跳过报告数据插入")
        return
    
    reports_data = [
        {
            "patient_id": studies[0].patient_id,
            "study_id": studies[0].id,
            "report_number": "RPT001",
            "report_type": "diagnostic",
            "report_title": "胸部X光检查报告",
            "status": "completed",
            "findings": "胸部X光检查显示双肺纹理清晰，心影大小正常，未见明显异常阴影。",
            "impression": "胸部X光检查未见异常。",
            "recommendations": "建议定期复查。",
            "radiologist_id": 1,
            "radiologist_name": "张医生",
            "reviewed_by": "李主任",
            "report_date": datetime.now() - timedelta(days=1)
        },
        {
            "patient_id": studies[1].patient_id,
            "study_id": studies[1].id,
            "report_number": "RPT002",
            "report_type": "diagnostic",
            "report_title": "头部CT检查报告",
            "status": "completed",
            "findings": "头部CT扫描显示脑实质密度均匀，未见出血、梗死等异常信号。脑室系统大小正常。",
            "impression": "头部CT检查未见异常。",
            "recommendations": "如有症状持续，建议进一步检查。",
            "radiologist_id": 1,
            "radiologist_name": "王医生",
            "reviewed_by": "李主任",
            "report_date": datetime.now() - timedelta(hours=18)
        },
        {
            "patient_id": studies[2].patient_id,
            "study_id": studies[2].id,
            "report_number": "RPT003",
            "report_type": "diagnostic",
            "report_title": "膝关节MRI检查报告",
            "status": "draft",
            "findings": "膝关节MRI检查正在分析中...",
            "impression": "待完成",
            "recommendations": "待完成",
            "radiologist_id": 1,
            "radiologist_name": "赵医生",
            "reviewed_by": None,
            "report_date": None
        }
    ]
    
    for report_data in reports_data:
        # 检查报告是否已存在
        existing = db.query(DiagnosticReport).filter(DiagnosticReport.report_number == report_data["report_number"]).first()
        if not existing:
            report = DiagnosticReport(**report_data)
            db.add(report)
            print(f"添加报告: {report_data['report_number']} - {report_data['status']}")
    
    db.commit()
    print(f"成功插入 {len(reports_data)} 个报告记录")

def main():
    """主函数"""
    print("开始插入测试数据...")
    
    # 获取数据库连接
    db = next(get_db())
    
    try:
        # 插入测试数据
        insert_test_patients(db)
        insert_test_studies(db)
        insert_test_reports(db)
        
        print("\n✅ 测试数据插入完成！")
        
        # 验证数据
        patient_count = db.query(Patient).count()
        study_count = db.query(Study).count()
        report_count = db.query(DiagnosticReport).count()

        print(f"\n📊 数据统计:")
        print(f"  患者数量: {patient_count}")
        print(f"  检查数量: {study_count}")
        print(f"  报告数量: {report_count}")
        
    except Exception as e:
        print(f"❌ 插入数据时发生错误: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
