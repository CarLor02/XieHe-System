"""
为 image_files 表添加 annotation 字段的迁移脚本

创建时间: 2026-01-15
"""

import sys
from pathlib import Path

# 添加项目根目录到路径
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.core.database import engine
from app.core.logging import get_logger

logger = get_logger(__name__)


def add_annotation_field():
    """为 image_files 表添加 annotation 字段"""
    try:
        with engine.connect() as conn:
            # 检查字段是否已存在
            result = conn.execute(text("""
                SELECT COUNT(*) as count
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = DATABASE()
                AND TABLE_NAME = 'image_files'
                AND COLUMN_NAME = 'annotation'
            """))
            
            exists = result.fetchone()[0] > 0
            
            if exists:
                logger.info("annotation 字段已存在，无需添加")
                return
            
            # 添加字段
            logger.info("正在添加 annotation 字段...")
            conn.execute(text("""
                ALTER TABLE image_files
                ADD COLUMN annotation TEXT COMMENT '标注数据(JSON格式)'
                AFTER description
            """))
            conn.commit()
            
            logger.info("✓ 成功添加 annotation 字段到 image_files 表")
            
    except Exception as e:
        logger.error(f"添加 annotation 字段失败: {e}")
        raise


if __name__ == "__main__":
    print("=" * 60)
    print("为 image_files 表添加 annotation 字段")
    print("=" * 60)
    
    try:
        add_annotation_field()
        print("\n迁移完成！")
    except Exception as e:
        print(f"\n迁移失败: {e}")
        sys.exit(1)
