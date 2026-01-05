"""
影像文件表初始化脚本

创建 image_files 表用于管理所有上传的影像文件

作者: XieHe Medical System
创建时间: 2026-01-05
"""

import sys
from pathlib import Path

# 添加项目根目录到Python路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy import create_engine, text
from app.core.database import engine
from app.models.base import Base
from app.models.image_file import ImageFile
from app.core.logging import get_logger

logger = get_logger(__name__)


def init_image_file_table():
    """初始化影像文件表"""
    try:
        logger.info("开始创建影像文件表...")
        
        # 创建表
        ImageFile.__table__.create(bind=engine, checkfirst=True)
        
        logger.info("✅ 影像文件表创建成功!")
        
        # 打印表结构
        with engine.connect() as conn:
            result = conn.execute(text("DESCRIBE image_files"))
            rows = result.fetchall()
            
            logger.info("\n影像文件表结构:")
            logger.info("-" * 80)
            for row in rows:
                logger.info(f"  {row[0]:<20} {row[1]:<15} {row[2]:<8} {row[3]:<8} {row[4]}")
            logger.info("-" * 80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 创建影像文件表失败: {e}")
        return False


if __name__ == "__main__":
    print("=" * 80)
    print("影像文件表初始化脚本")
    print("=" * 80)
    
    success = init_image_file_table()
    
    if success:
        print("\n✅ 初始化完成!")
        sys.exit(0)
    else:
        print("\n❌ 初始化失败!")
        sys.exit(1)
