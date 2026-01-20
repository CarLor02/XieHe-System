"""
数据迁移脚本：从Study/Series/Instance模型迁移到简化的ImageFile模型

此脚本将：
1. 将Study/Series/Instance数据迁移到ImageFile表
2. 更新ImageAnnotation和AITask的关联关系
3. 保留原有数据用于回滚

作者: XieHe Medical System
创建时间: 2026-01-14
"""

import sys
import os
from pathlib import Path
from datetime import datetime
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
import logging

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataMigration:
    """数据迁移类"""

    def __init__(self, db_url: str = None):
        """初始化迁移"""
        # 延迟导入配置，避免循环导入
        from app.core.config import settings as app_settings

        self.db_url = db_url or app_settings.DATABASE_URL
        logger.info(f"数据库连接: {self.db_url.split('@')[1] if '@' in self.db_url else 'N/A'}")

        try:
            self.engine = create_engine(
                self.db_url,
                pool_pre_ping=True,  # 连接前检查
                pool_recycle=3600,   # 1小时回收连接
                echo=False
            )
            self.SessionLocal = sessionmaker(bind=self.engine)

            # 测试连接
            with self.engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            logger.info("数据库连接成功")

        except Exception as e:
            logger.error(f"数据库连接失败: {str(e)}")
            raise

    def check_tables_exist(self) -> bool:
        """检查必要的表是否存在"""
        required_tables = ['studies', 'series', 'instances', 'image_files']

        try:
            with self.engine.connect() as conn:
                result = conn.execute(text("SHOW TABLES"))
                existing_tables = [row[0] for row in result]

                logger.info(f"数据库中的表: {existing_tables}")

                missing_tables = [t for t in required_tables if t not in existing_tables]
                if missing_tables:
                    logger.warning(f"缺少以下表: {missing_tables}")
                    return False

                return True
        except Exception as e:
            logger.error(f"检查表失败: {str(e)}")
            return False
        
    def migrate_instances_to_image_files(self, db: Session, dry_run: bool = True):
        """
        将Instance数据迁移到ImageFile

        Args:
            db: 数据库会话
            dry_run: 是否为试运行模式
        """
        # 延迟导入模型
        from app.models.image import Study, Series, Instance
        from app.models.image_file import ImageFile, ImageFileTypeEnum, ImageFileStatusEnum

        logger.info("开始迁移Instance数据到ImageFile...")

        # 查询所有未删除的Instance
        instances = db.query(Instance).filter(Instance.is_deleted == False).all()
        logger.info(f"找到 {len(instances)} 个Instance记录")
        
        migrated_count = 0
        skipped_count = 0
        
        for instance in instances:
            try:
                # 获取关联的Series和Study
                series = db.query(Series).filter(Series.id == instance.series_id).first()
                if not series:
                    logger.warning(f"Instance {instance.id} 没有关联的Series，跳过")
                    skipped_count += 1
                    continue
                    
                study = db.query(Study).filter(Study.id == series.study_id).first()
                if not study:
                    logger.warning(f"Series {series.id} 没有关联的Study，跳过")
                    skipped_count += 1
                    continue
                
                # 检查是否已经迁移
                existing = db.query(ImageFile).filter(
                    ImageFile.file_hash == instance.file_hash
                ).first()
                
                if existing:
                    logger.info(f"Instance {instance.id} 已经迁移，跳过")
                    skipped_count += 1
                    continue
                
                # 判断文件状态：如果没有本地存储路径，则为待处理
                storage_path = instance.file_path or ""
                has_local_file = bool(storage_path and storage_path.strip())

                # 创建ImageFile记录
                image_file = ImageFile(
                    file_uuid=instance.sop_instance_uid,
                    original_filename=instance.file_name or f"instance_{instance.id}.dcm",
                    file_type=ImageFileTypeEnum.DICOM,
                    mime_type="application/dicom",
                    storage_path=storage_path,
                    file_size=instance.file_size or 0,
                    file_hash=instance.file_hash,
                    thumbnail_path=instance.thumbnail_path,
                    uploaded_by=instance.created_by or 1,  # 默认用户ID
                    patient_id=study.patient_id,
                    study_id=study.id,  # 保留关联用于回滚
                    series_id=series.id,  # 保留关联用于回滚
                    modality=str(series.modality.value) if series.modality else None,
                    body_part=str(series.body_part.value) if series.body_part else None,
                    study_date=study.study_date,
                    description=f"{study.study_description or ''} - {series.series_description or ''}",
                    status=ImageFileStatusEnum.PROCESSED if has_local_file else ImageFileStatusEnum.PENDING,
                    upload_progress=100 if has_local_file else 0,
                    created_at=instance.created_at,
                    updated_at=instance.updated_at,
                    uploaded_at=instance.processed_at or instance.created_at if has_local_file else None,
                )
                
                if not dry_run:
                    db.add(image_file)
                    db.flush()  # 获取ID
                    
                    # 更新ImageAnnotation关联
                    from app.models.image import ImageAnnotation
                    db.query(ImageAnnotation).filter(
                        ImageAnnotation.instance_id == instance.id
                    ).update({"image_file_id": image_file.id})
                    
                migrated_count += 1
                logger.info(f"迁移Instance {instance.id} -> ImageFile {image_file.id if not dry_run else 'DRY_RUN'}")
                
            except Exception as e:
                logger.error(f"迁移Instance {instance.id} 失败: {str(e)}")
                if not dry_run:
                    db.rollback()
                raise
        
        if not dry_run:
            db.commit()
            
        logger.info(f"迁移完成: 成功 {migrated_count}, 跳过 {skipped_count}")
        return migrated_count, skipped_count
    
    def migrate_ai_tasks(self, db: Session, dry_run: bool = True):
        """
        更新AITask的关联关系

        Args:
            db: 数据库会话
            dry_run: 是否为试运行模式
        """
        # 延迟导入模型
        from app.models.image import AITask
        from app.models.image_file import ImageFile

        logger.info("开始更新AITask关联关系...")

        # 查询所有有study_id但没有image_file_id的AITask
        ai_tasks = db.query(AITask).filter(
            AITask.study_id.isnot(None),
            AITask.image_file_id.is_(None),
            AITask.is_deleted == False
        ).all()
        
        logger.info(f"找到 {len(ai_tasks)} 个需要更新的AITask记录")

        updated_count = 0

        for task in ai_tasks:
            try:
                # 查找该study对应的第一个ImageFile
                image_file = db.query(ImageFile).filter(
                    ImageFile.study_id == task.study_id,
                    ImageFile.is_deleted == False
                ).first()

                if image_file:
                    if not dry_run:
                        task.image_file_id = image_file.id
                    updated_count += 1
                    logger.info(f"更新AITask {task.id} -> ImageFile {image_file.id if not dry_run else 'DRY_RUN'}")
                else:
                    logger.warning(f"AITask {task.id} 的Study {task.study_id} 没有对应的ImageFile")

            except Exception as e:
                logger.error(f"更新AITask {task.id} 失败: {str(e)}")
                if not dry_run:
                    db.rollback()
                raise

        if not dry_run:
            db.commit()

        logger.info(f"更新完成: {updated_count} 个AITask")
        return updated_count

    def run_migration(self, dry_run: bool = True):
        """
        执行完整迁移

        Args:
            dry_run: 是否为试运行模式
        """
        logger.info("=" * 80)
        logger.info(f"开始数据迁移 {'(试运行模式)' if dry_run else '(正式模式)'}")
        logger.info("=" * 80)

        # 检查表是否存在
        if not self.check_tables_exist():
            logger.error("必要的表不存在，请先创建数据库表")
            logger.info("提示：可能需要先运行数据库初始化脚本")
            return

        db = self.SessionLocal()
        try:
            # 步骤1: 迁移Instance到ImageFile
            migrated, skipped = self.migrate_instances_to_image_files(db, dry_run)

            # 步骤2: 更新AITask关联
            updated = self.migrate_ai_tasks(db, dry_run)

            logger.info("=" * 80)
            logger.info("迁移摘要:")
            logger.info(f"  - Instance迁移: {migrated} 成功, {skipped} 跳过")
            logger.info(f"  - AITask更新: {updated} 个")
            logger.info("=" * 80)

            if dry_run:
                logger.info("这是试运行，没有实际修改数据库")
                logger.info("要执行实际迁移，请使用 --execute 参数")
            else:
                logger.info("迁移已完成！")

        except Exception as e:
            logger.error(f"迁移失败: {str(e)}")
            db.rollback()
            raise
        finally:
            db.close()


def main():
    """主函数"""
    import argparse

    parser = argparse.ArgumentParser(description="数据迁移脚本")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="执行实际迁移（默认为试运行）"
    )
    parser.add_argument(
        "--db-url",
        type=str,
        help="数据库URL（可选，默认使用配置文件）"
    )

    args = parser.parse_args()

    migration = DataMigration(db_url=args.db_url)
    migration.run_migration(dry_run=not args.execute)


if __name__ == "__main__":
    main()

