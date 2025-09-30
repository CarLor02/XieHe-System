#!/usr/bin/env python3
"""
测试数据准备脚本

将之前硬编码的数据写入数据库，创建完整的测试数据集
包括：患者、影像、报告、权限、模型等数据

@author XieHe Medical System
@created 2025-09-29
"""

import sys
import os
import logging
from datetime import datetime, timedelta
import random
import json

# 添加后端路径
sys.path.append('/xinray/data/百度云/xhe/XieHe-System/backend')

from app.core.database import get_db
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

class TestDataPreparer:
    def __init__(self):
        self.db = next(get_db())
        
    def __del__(self):
        if hasattr(self, 'db'):
            self.db.close()
    
    def prepare_patient_data(self):
        """准备患者测试数据"""
        logger.info("=" * 50)
        logger.info("准备患者测试数据")
        logger.info("=" * 50)
        
        try:
            # 检查现有患者数量
            result = self.db.execute(text("SELECT COUNT(*) FROM patients"))
            existing_count = result.scalar()
            logger.info(f"现有患者数量: {existing_count}")
            
            if existing_count >= 10:
                logger.info("患者数据已足够，跳过创建")
                return
            
            # 患者模板数据
            patient_templates = [
                ("张三", "男", "1985-03-15", "13800138001", "北京市朝阳区", "脊柱侧弯", "轻度脊柱侧弯，需要定期观察"),
                ("李四", "女", "1990-07-22", "13800138002", "上海市浦东新区", "腰椎间盘突出", "L4-L5椎间盘突出，建议保守治疗"),
                ("王五", "男", "1978-11-08", "13800138003", "广州市天河区", "颈椎病", "颈椎生理曲度变直，颈5-6椎间盘突出"),
                ("赵六", "女", "1995-01-30", "13800138004", "深圳市南山区", "胸椎压缩性骨折", "T12椎体压缩性骨折，需要手术治疗"),
                ("钱七", "男", "1982-09-12", "13800138005", "杭州市西湖区", "腰椎滑脱", "L5椎体I度滑脱，建议手术治疗"),
                ("孙八", "女", "1988-05-18", "13800138006", "南京市鼓楼区", "脊柱侧弯", "青少年特发性脊柱侧弯，Cobb角35度"),
                ("周九", "男", "1975-12-03", "13800138007", "武汉市武昌区", "腰椎管狭窄", "L3-L5椎管狭窄，间歇性跛行"),
                ("吴十", "女", "1992-08-25", "13800138008", "成都市锦江区", "颈椎外伤", "颈椎挥鞭样损伤，颈部疼痛"),
                ("郑十一", "男", "1980-04-14", "13800138009", "重庆市渝中区", "腰椎退行性变", "多节段腰椎退行性变，腰痛"),
                ("陈十二", "女", "1987-10-07", "13800138010", "西安市雁塔区", "胸腰椎骨折", "T12-L1爆裂性骨折，已手术"),
            ]
            
            for i, (name, gender, birth_date, phone, address, diagnosis, description) in enumerate(patient_templates, 1):
                try:
                    patient_id = f"P{datetime.now().strftime('%Y%m%d')}{i:03d}"
                    
                    # 插入患者数据
                    insert_sql = text("""
                        INSERT INTO patients (
                            patient_id, name, gender, birth_date, phone, address,
                            notes, created_at, updated_at, status
                        ) VALUES (
                            :patient_id, :name, :gender, :birth_date, :phone, :address,
                            :notes, :created_at, :updated_at, :status
                        )
                    """)
                    
                    # 转换性别格式
                    gender_map = {'男': 'MALE', '女': 'FEMALE'}
                    db_gender = gender_map.get(gender, 'UNKNOWN')

                    self.db.execute(insert_sql, {
                        'patient_id': patient_id,
                        'name': name,
                        'gender': db_gender,
                        'birth_date': birth_date,
                        'phone': phone,
                        'address': address,
                        'notes': f"{diagnosis}: {description}",
                        'created_at': datetime.now(),
                        'updated_at': datetime.now(),
                        'status': 'ACTIVE'
                    })
                    
                    logger.info(f"  ✅ 创建患者: {name} ({patient_id})")
                    
                except IntegrityError:
                    logger.warning(f"  ⚠️ 患者 {name} 已存在，跳过")
                    continue
            
            self.db.commit()
            logger.info("患者数据准备完成")
            
        except Exception as e:
            logger.error(f"准备患者数据失败: {e}")
            self.db.rollback()
    
    def prepare_study_data(self):
        """准备影像检查数据"""
        logger.info("=" * 50)
        logger.info("准备影像检查数据")
        logger.info("=" * 50)
        
        try:
            # 检查现有检查数量
            result = self.db.execute(text("SELECT COUNT(*) FROM studies"))
            existing_count = result.scalar()
            logger.info(f"现有检查数量: {existing_count}")
            
            if existing_count >= 15:
                logger.info("影像检查数据已足够，跳过创建")
                return
            
            # 获取患者列表
            result = self.db.execute(text("SELECT id, patient_id, name FROM patients LIMIT 10"))
            patients = result.fetchall()
            
            if not patients:
                logger.error("没有找到患者数据，无法创建影像检查")
                return
            
            # 影像检查模板
            study_templates = [
                ("腰椎正侧位X线", "XR", "腰椎正侧位X线摄影检查", "腰椎退行性变"),
                ("颈椎正侧位X线", "XR", "颈椎正侧位X线摄影检查", "颈椎生理曲度变直"),
                ("胸腰椎MRI", "MR", "胸腰椎磁共振成像检查", "椎间盘突出"),
                ("颈椎MRI", "MR", "颈椎磁共振成像检查", "颈椎间盘突出"),
                ("腰椎CT", "CT", "腰椎计算机断层扫描", "腰椎管狭窄"),
                ("全脊柱X线", "XR", "全脊柱正位X线摄影", "脊柱侧弯"),
                ("胸椎CT", "CT", "胸椎计算机断层扫描", "胸椎压缩性骨折"),
                ("腰骶椎X线", "XR", "腰骶椎正侧位X线摄影", "腰椎滑脱"),
            ]
            
            for i, patient in enumerate(patients):
                patient_db_id, patient_id, patient_name = patient
                
                # 为每个患者创建1-3个检查
                num_studies = random.randint(1, 3)
                
                for j in range(num_studies):
                    template = random.choice(study_templates)
                    study_name, modality, description, finding = template
                    
                    study_id = f"ST{datetime.now().strftime('%Y%m%d')}{i+1:02d}{j+1:02d}"
                    study_date = datetime.now() - timedelta(days=random.randint(1, 365))
                    
                    try:
                        insert_sql = text("""
                            INSERT INTO studies (
                                study_instance_uid, study_id, patient_id, study_date,
                                study_description, modality, status, created_at, updated_at
                            ) VALUES (
                                :study_instance_uid, :study_id, :patient_id, :study_date,
                                :study_description, :modality, :status, :created_at, :updated_at
                            )
                        """)
                        
                        self.db.execute(insert_sql, {
                            'study_instance_uid': f"1.2.840.{random.randint(100000, 999999)}.{random.randint(100000, 999999)}",
                            'study_id': study_id,
                            'patient_id': patient_db_id,  # 使用数据库ID
                            'study_date': study_date.date(),
                            'study_description': study_name,
                            'modality': modality,
                            'status': 'COMPLETED',
                            'created_at': datetime.now(),
                            'updated_at': datetime.now()
                        })
                        
                        logger.info(f"  ✅ 创建检查: {patient_name} - {study_name} ({study_id})")
                        
                    except IntegrityError:
                        logger.warning(f"  ⚠️ 检查 {study_id} 已存在，跳过")
                        continue
            
            self.db.commit()
            logger.info("影像检查数据准备完成")
            
        except Exception as e:
            logger.error(f"准备影像检查数据失败: {e}")
            self.db.rollback()
    
    def prepare_report_data(self):
        """准备报告数据"""
        logger.info("=" * 50)
        logger.info("准备报告数据")
        logger.info("=" * 50)
        
        try:
            # 检查是否存在reports表
            try:
                result = self.db.execute(text("SELECT COUNT(*) FROM reports"))
                existing_count = result.scalar()
                logger.info(f"现有报告数量: {existing_count}")

                if existing_count >= 10:
                    logger.info("报告数据已足够，跳过创建")
                    return

            except Exception:
                # 表不存在，创建表
                logger.info("reports表不存在，创建表...")
                create_table_sql = text("""
                    CREATE TABLE IF NOT EXISTS reports (
                        id INT AUTO_INCREMENT PRIMARY KEY,
                        report_id VARCHAR(50) UNIQUE NOT NULL,
                        study_id INT NOT NULL,
                        findings TEXT,
                        diagnosis TEXT,
                        recommendation TEXT,
                        status ENUM('DRAFT', 'PENDING', 'COMPLETED', 'CANCELLED') DEFAULT 'DRAFT',
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        created_by VARCHAR(100),
                        updated_by VARCHAR(100),
                        is_deleted TINYINT(1) DEFAULT 0,
                        deleted_at DATETIME,
                        deleted_by VARCHAR(100),
                        INDEX idx_study_id (study_id),
                        INDEX idx_report_id (report_id),
                        INDEX idx_status (status)
                    )
                """)
                self.db.execute(create_table_sql)
                self.db.commit()
                logger.info("reports表创建成功")
            
            # 获取检查列表
            result = self.db.execute(text("""
                SELECT s.id, s.study_id, s.study_description, p.name as patient_name
                FROM studies s
                JOIN patients p ON s.patient_id = p.id
                LIMIT 10
            """))
            studies = result.fetchall()
            
            if not studies:
                logger.error("没有找到检查数据，无法创建报告")
                return
            
            # 报告模板
            report_templates = [
                ("影像所见：腰椎生理曲度存在，椎体边缘骨质增生，L4-L5椎间隙变窄。", 
                 "诊断意见：腰椎退行性变，L4-L5椎间盘突出可能。", 
                 "建议进一步MRI检查明确诊断。"),
                ("影像所见：颈椎生理曲度变直，C5-C6椎间盘信号减低。", 
                 "诊断意见：颈椎病，C5-C6椎间盘退变。", 
                 "建议避免长时间低头，适当颈部功能锻炼。"),
                ("影像所见：胸12椎体高度丢失约30%，椎体内见骨折线。", 
                 "诊断意见：T12椎体压缩性骨折。", 
                 "建议卧床休息，必要时手术治疗。"),
                ("影像所见：脊柱呈C型侧弯，顶椎位于T8水平，Cobb角约35度。", 
                 "诊断意见：胸椎右凸脊柱侧弯。", 
                 "建议定期随访，考虑支具治疗。"),
            ]
            
            for i, study in enumerate(studies):
                study_db_id, study_id, study_name, patient_name = study
                template = random.choice(report_templates)
                findings, diagnosis, recommendation = template
                
                report_id = f"RPT{datetime.now().strftime('%Y%m%d')}{i+1:03d}"
                
                try:
                    insert_sql = text("""
                        INSERT INTO reports (
                            report_id, study_id, findings, diagnosis, recommendation,
                            status, created_at, updated_at, created_by
                        ) VALUES (
                            :report_id, :study_id, :findings, :diagnosis, :recommendation,
                            :status, :created_at, :updated_at, :created_by
                        )
                    """)
                    
                    self.db.execute(insert_sql, {
                        'report_id': report_id,
                        'study_id': study_db_id,  # 使用数据库ID
                        'findings': findings,
                        'diagnosis': diagnosis,
                        'recommendation': recommendation,
                        'status': 'COMPLETED',
                        'created_at': datetime.now(),
                        'updated_at': datetime.now(),
                        'created_by': 'admin'
                    })
                    
                    logger.info(f"  ✅ 创建报告: {patient_name} - {study_name} ({report_id})")
                    
                except IntegrityError:
                    logger.warning(f"  ⚠️ 报告 {report_id} 已存在，跳过")
                    continue
            
            self.db.commit()
            logger.info("报告数据准备完成")
            
        except Exception as e:
            logger.error(f"准备报告数据失败: {e}")
            self.db.rollback()
    
    def prepare_model_data(self):
        """准备AI模型数据"""
        logger.info("=" * 50)
        logger.info("准备AI模型数据")
        logger.info("=" * 50)
        
        try:
            # 检查是否存在ai_models表
            try:
                result = self.db.execute(text("SELECT COUNT(*) FROM ai_models"))
                existing_count = result.scalar()
                logger.info(f"现有AI模型数量: {existing_count}")
                
                if existing_count >= 5:
                    logger.info("AI模型数据已足够，跳过创建")
                    return
                    
            except Exception:
                # 表不存在，创建表
                logger.info("ai_models表不存在，创建表...")
                create_table_sql = text("""
                    CREATE TABLE IF NOT EXISTS ai_models (
                        id VARCHAR(50) PRIMARY KEY,
                        name VARCHAR(200) NOT NULL,
                        description TEXT,
                        model_type VARCHAR(50) NOT NULL,
                        version VARCHAR(20) NOT NULL,
                        status VARCHAR(20) NOT NULL,
                        accuracy DECIMAL(5,3),
                        precision_score DECIMAL(5,3),
                        recall_score DECIMAL(5,3),
                        f1_score DECIMAL(5,3),
                        training_data_size INT,
                        inference_time_ms DECIMAL(8,2),
                        memory_usage_mb DECIMAL(10,2),
                        created_at DATETIME NOT NULL,
                        updated_at DATETIME NOT NULL,
                        last_trained_at DATETIME,
                        deployment_url VARCHAR(500),
                        tags JSON,
                        creator VARCHAR(100)
                    )
                """)
                self.db.execute(create_table_sql)
                self.db.commit()
                logger.info("ai_models表创建成功")
            
            # AI模型模板数据
            model_templates = [
                ("术前X线预测术后X线模型", "基于深度学习算法，通过分析术前X线影像，预测手术后的X线影像结果", "prediction"),
                ("支具有效性预测模型", "智能分析患者脊柱状况和支具参数，预测支具治疗的有效性", "prediction"),
                ("脊柱侧弯检测模型", "自动检测X线影像中的脊柱侧弯程度和类型", "detection"),
                ("椎体分割模型", "精确分割脊柱X线影像中的各个椎体结构", "segmentation"),
                ("骨密度评估模型", "基于X线影像评估骨密度和骨质疏松风险", "classification"),
            ]
            
            for i, (name, description, model_type) in enumerate(model_templates, 1):
                model_id = f"MODEL_{i:03d}"
                
                try:
                    insert_sql = text("""
                        INSERT INTO ai_models (
                            id, name, description, model_type, version, status,
                            accuracy, precision_score, recall_score, f1_score,
                            training_data_size, inference_time_ms, memory_usage_mb,
                            created_at, updated_at, last_trained_at, deployment_url,
                            tags, creator
                        ) VALUES (
                            :id, :name, :description, :model_type, :version, :status,
                            :accuracy, :precision_score, :recall_score, :f1_score,
                            :training_data_size, :inference_time_ms, :memory_usage_mb,
                            :created_at, :updated_at, :last_trained_at, :deployment_url,
                            :tags, :creator
                        )
                    """)
                    
                    self.db.execute(insert_sql, {
                        'id': model_id,
                        'name': name,
                        'description': description,
                        'model_type': model_type,
                        'version': f"{random.randint(1, 3)}.{random.randint(0, 9)}.{random.randint(0, 9)}",
                        'status': random.choice(['deployed', 'ready', 'training']),
                        'accuracy': round(random.uniform(0.85, 0.98), 3),
                        'precision_score': round(random.uniform(0.80, 0.95), 3),
                        'recall_score': round(random.uniform(0.82, 0.96), 3),
                        'f1_score': round(random.uniform(0.83, 0.94), 3),
                        'training_data_size': random.randint(1000, 50000),
                        'inference_time_ms': round(random.uniform(50, 500), 1),
                        'memory_usage_mb': round(random.uniform(100, 2000), 1),
                        'created_at': datetime.now(),
                        'updated_at': datetime.now(),
                        'last_trained_at': datetime.now() - timedelta(days=random.randint(1, 90)),
                        'deployment_url': f"https://api.xiehe.com/models/{model_id}",
                        'tags': json.dumps(["深度学习", "医疗AI", "脊柱"]),
                        'creator': random.choice(["张医生", "李工程师", "王研究员"])
                    })
                    
                    logger.info(f"  ✅ 创建AI模型: {name} ({model_id})")
                    
                except IntegrityError:
                    logger.warning(f"  ⚠️ AI模型 {model_id} 已存在，跳过")
                    continue
            
            self.db.commit()
            logger.info("AI模型数据准备完成")
            
        except Exception as e:
            logger.error(f"准备AI模型数据失败: {e}")
            self.db.rollback()
    
    def run_all_preparations(self):
        """运行所有数据准备"""
        logger.info("=" * 60)
        logger.info("开始准备测试数据")
        logger.info("=" * 60)
        
        try:
            # 1. 准备患者数据
            self.prepare_patient_data()
            
            # 2. 准备影像检查数据
            self.prepare_study_data()
            
            # 3. 准备报告数据
            self.prepare_report_data()
            
            # 4. 准备AI模型数据
            self.prepare_model_data()
            
            logger.info("=" * 60)
            logger.info("测试数据准备完成")
            logger.info("=" * 60)
            
            # 显示最终统计
            self.show_data_summary()
            
        except Exception as e:
            logger.error(f"数据准备过程中出现错误: {e}")
    
    def show_data_summary(self):
        """显示数据统计摘要"""
        logger.info("=" * 50)
        logger.info("数据统计摘要")
        logger.info("=" * 50)
        
        tables = [
            ("patients", "患者"),
            ("studies", "影像检查"),
            ("reports", "报告"),
            ("ai_models", "AI模型"),
            ("permissions", "权限"),
            ("roles", "角色"),
            ("users", "用户")
        ]
        
        for table_name, description in tables:
            try:
                result = self.db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                count = result.scalar()
                logger.info(f"  {description} ({table_name}): {count}条")
            except Exception:
                logger.info(f"  {description} ({table_name}): 表不存在")

if __name__ == "__main__":
    preparer = TestDataPreparer()
    preparer.run_all_preparations()
