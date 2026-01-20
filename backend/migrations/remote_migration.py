"""
远程数据库迁移脚本
用于连接远程服务器并执行数据迁移

使用方法:
    python migrations/remote_migration.py --check          # 检查状态
    python migrations/remote_migration.py --backup         # 备份数据库
    python migrations/remote_migration.py --migrate        # 迁移数据
    python migrations/remote_migration.py --cleanup        # 清理旧表
    python migrations/remote_migration.py --full           # 完整迁移流程
"""

import sys
import os
from pathlib import Path
import argparse
from datetime import datetime
import pymysql
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# 添加项目根目录到路径
sys.path.insert(0, str(Path(__file__).parent.parent))

# 远程数据库配置
REMOTE_DB_CONFIG = {
    'host': '115.190.121.59',
    'port': 3306,
    'user': 'root',
    'password': 'qweasd2025',
    'database': 'medical_imaging_system',
    'charset': 'utf8mb4'
}


class RemoteMigration:
    """远程数据库迁移类"""
    
    def __init__(self):
        self.config = REMOTE_DB_CONFIG
        self.db_url = (
            f"mysql+pymysql://{self.config['user']}:{self.config['password']}"
            f"@{self.config['host']}:{self.config['port']}/{self.config['database']}"
            f"?charset={self.config['charset']}"
        )
        
    def test_connection(self):
        """测试数据库连接"""
        print("🔍 测试远程数据库连接...")
        try:
            conn = pymysql.connect(**self.config)
            print(f"✅ 成功连接到 {self.config['host']}")
            
            with conn.cursor() as cursor:
                cursor.execute("SELECT VERSION()")
                version = cursor.fetchone()
                print(f"   MySQL 版本: {version[0]}")
                
                cursor.execute("SELECT DATABASE()")
                db = cursor.fetchone()
                print(f"   当前数据库: {db[0]}")
                
            conn.close()
            return True
        except Exception as e:
            print(f"❌ 连接失败: {e}")
            return False
    
    def check_status(self):
        """检查迁移状态"""
        print("\n📊 检查数据库状态...")
        try:
            conn = pymysql.connect(**self.config)
            with conn.cursor() as cursor:
                # 检查旧表
                old_tables = ['studies', 'series', 'instances']
                print("\n旧表状态:")
                for table in old_tables:
                    cursor.execute(f"SHOW TABLES LIKE '{table}'")
                    exists = cursor.fetchone()
                    status = "✅ 存在" if exists else "❌ 不存在"
                    print(f"  {table}: {status}")
                
                # 检查字段
                print("\n字段状态:")
                tables_fields = {
                    'image_files': ['study_id', 'series_id'],
                    'image_annotations': ['study_id', 'instance_id', 'image_file_id'],
                    'ai_tasks': ['study_id', 'image_file_id']
                }
                
                for table, fields in tables_fields.items():
                    cursor.execute(f"DESCRIBE {table}")
                    existing_fields = [row[0] for row in cursor.fetchall()]
                    print(f"\n  {table}:")
                    for field in fields:
                        status = "✅ 存在" if field in existing_fields else "❌ 不存在"
                        print(f"    {field}: {status}")
                
                # 统计数据
                print("\n数据统计:")
                cursor.execute("SELECT COUNT(*) FROM image_files")
                count = cursor.fetchone()[0]
                print(f"  image_files: {count} 条记录")
                
                if 'instances' in [t for t in old_tables if cursor.execute(f"SHOW TABLES LIKE '{t}'")]:
                    cursor.execute("SELECT COUNT(*) FROM instances WHERE is_deleted = 0")
                    count = cursor.fetchone()[0]
                    print(f"  instances: {count} 条记录")
                
            conn.close()
            return True
        except Exception as e:
            print(f"❌ 检查失败: {e}")
            return False
    
    def backup_database(self):
        """备份数据库"""
        print("\n💾 备份远程数据库...")
        backup_file = f"backup_remote_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
        
        cmd = (
            f"mysqldump -h {self.config['host']} -P {self.config['port']} "
            f"-u {self.config['user']} -p{self.config['password']} "
            f"{self.config['database']} > {backup_file}"
        )
        
        print(f"执行命令: mysqldump -h {self.config['host']} ... > {backup_file}")
        print("\n⚠️  请手动执行以下命令进行备份:")
        print(f"\n{cmd}\n")
        
        response = input("备份完成后，输入 'yes' 继续: ")
        return response.lower() == 'yes'
    
    def run_sql_file(self, sql_file):
        """执行 SQL 文件"""
        print(f"\n📝 执行 SQL 文件: {sql_file}")
        
        sql_path = Path(__file__).parent / sql_file
        if not sql_path.exists():
            print(f"❌ 文件不存在: {sql_path}")
            return False
        
        try:
            with open(sql_path, 'r', encoding='utf-8') as f:
                sql_content = f.read()
            
            conn = pymysql.connect(**self.config)
            with conn.cursor() as cursor:
                # 分割并执行每个语句
                for statement in sql_content.split(';'):
                    statement = statement.strip()
                    if statement and not statement.startswith('--'):
                        cursor.execute(statement)
            
            conn.commit()
            conn.close()
            print("✅ SQL 文件执行成功")
            return True
        except Exception as e:
            print(f"❌ 执行失败: {e}")
            return False


def main():
    parser = argparse.ArgumentParser(description='远程数据库迁移工具')
    parser.add_argument('--check', action='store_true', help='检查数据库状态')
    parser.add_argument('--backup', action='store_true', help='备份数据库')
    parser.add_argument('--add-fields', action='store_true', help='添加新字段')
    parser.add_argument('--migrate', action='store_true', help='迁移数据')
    parser.add_argument('--cleanup', action='store_true', help='清理旧表')
    parser.add_argument('--full', action='store_true', help='完整迁移流程')
    
    args = parser.parse_args()
    
    migration = RemoteMigration()
    
    # 测试连接
    if not migration.test_connection():
        print("\n❌ 无法连接到远程数据库，请检查配置")
        return
    
    if args.check or args.full:
        migration.check_status()
    
    if args.backup or args.full:
        if not migration.backup_database():
            print("❌ 备份未完成，停止迁移")
            return
    
    if args.add_fields or args.full:
        if not migration.run_sql_file('add_image_file_id_columns.sql'):
            print("❌ 添加字段失败")
            return
    
    if args.migrate or args.full:
        print("\n⚠️  请手动执行数据迁移脚本:")
        print("python migrations/migrate_to_simplified_model.py --execute")
        if not args.full:
            return
        response = input("\n数据迁移完成后，输入 'yes' 继续: ")
        if response.lower() != 'yes':
            return
    
    if args.cleanup or args.full:
        print("\n⚠️  即将删除旧表和字段，这是不可逆的操作！")
        response = input("确认执行清理？输入 'yes' 继续: ")
        if response.lower() == 'yes':
            migration.run_sql_file('cleanup_old_tables.sql')
    
    print("\n✅ 迁移完成！")


if __name__ == '__main__':
    main()

